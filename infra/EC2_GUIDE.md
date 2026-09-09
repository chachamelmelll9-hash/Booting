# AWS EC2 배포 가이드

서버(NestJS)를 AWS EC2 우분투 VM에 올리고 Caddy로 서비스한다.
`.github/workflows/deploy.yml` 이 `main` 에 서버 코드가 올라갈 때마다 자동 배포한다.

배포 방식 자체는 업체와 무관하다 — GHCR에 이미지를 올리고, SSH로 들어가
`docker compose` 를 다시 띄운다. 그래서 나중에 Oracle이나 다른 곳으로 옮겨도
이 문서의 1~3번만 다시 하면 된다.

---

## 0. 왜 EC2인가

- **12개월 무료** (`t3.micro` 750시간/월 = 1대를 24시간 켜둬도 무료)
- 이미 있는 `infra/oracle/` 의 `setup.sh` · `docker-compose.yml` · `Caddyfile` 을
  그대로 쓴다 (Ubuntu + Docker + Caddy 조합이라 업체를 안 가린다)
- 12개월 뒤부터 월 $10 정도

---

## 1. EC2 인스턴스 만들기

AWS 콘솔 → EC2 → **Launch instance**

| 항목 | 값 |
|---|---|
| Name | `booting-server` |
| AMI | **Ubuntu Server 24.04 LTS** |
| Instance type | **t3.micro** (프리티어 표시 확인) |
| Key pair | 새로 생성 → **`.pem` 파일 다운로드** (이게 SSH 키다. 다시 못 받는다) |
| Network → Allow | **SSH(22)**, **HTTP(80)**, **HTTPS(443)** 체크 |
| Storage | 기본 8GB → **20GB** 권장 (도커 이미지가 쌓인다) |

만든 뒤 **Elastic IP** 를 할당해 붙인다 (EC2 → Elastic IPs → Allocate → Associate).
안 붙이면 인스턴스를 껐다 켤 때 **공인 IP가 바뀌고**, 부모님께 보낸 링크가 전부 죽는다.
Elastic IP는 실행 중인 인스턴스에 붙어 있는 동안 무료다.

---

## 2. 서버 초기 설정

로컬에서 `.pem` 권한을 잠그고 접속한다.

```bash
chmod 400 booting-key.pem
ssh -i booting-key.pem ubuntu@<Elastic IP>
```

VM 안에서 Docker·Caddy·방화벽을 한 번에 설치한다.

```bash
# 이 저장소의 infra/oracle/setup.sh 내용을 그대로 실행한다
curl -fsSL https://raw.githubusercontent.com/<owner>/Booting/main/infra/oracle/setup.sh | bash
# 또는 로컬에서: scp -i booting-key.pem infra/oracle/setup.sh ubuntu@<IP>:~ && bash ~/setup.sh
```

설치 후 도커 그룹 반영을 위해 **한 번 로그아웃했다 다시 접속**한다.

이어서 앱 디렉터리와 설정을 올린다.

```bash
# 로컬에서
scp -i booting-key.pem infra/oracle/docker-compose.yml ubuntu@<IP>:~/app/docker-compose.yml
scp -i booting-key.pem infra/oracle/Caddyfile        ubuntu@<IP>:~/Caddyfile

# VM 안에서
sudo mv ~/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

`~/app/.env` 를 만들고 **서버 환경변수**를 채운다 (`infra/oracle/.env.example` 참고).
값은 `apps/server/.env.production` 과 같아야 한다.

---

## 3. GitHub Secrets 등록

저장소 → Settings → Secrets and variables → Actions → **New repository secret**

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | Elastic IP |
| `DEPLOY_SSH_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | `.pem` 파일 **내용 전체** (`-----BEGIN ...` 부터 끝까지) |

셋 다 없으면 배포 워크플로가 조용히 건너뛴다 (에러가 아니라 경고로 남는다).

이제 `main` 에 서버 코드를 올리면 자동 배포된다. 수동 실행은
Actions → **Deploy Server** → Run workflow.

---

## 4. 도메인과 HTTPS

**도메인이 정해지기 전까지는 HTTP 로만 열린다.** `Caddyfile` 이 `SERVER_DOMAIN`
환경변수가 없으면 `:80` 으로 뜨게 돼 있다. 이 상태로 `curl http://<IP>/api/health`
가 되면 배포는 성공한 것이다.

> ⚠️ HTTP 상태를 실사용자에게 열면 안 된다. 부모님 브라우저에 '안전하지 않음'이
> 뜨고, 안드로이드 앱은 평문 HTTP 를 기본 차단하며, 카톡이 링크를 막을 수 있다.

도메인이 생기면 VM에서:

```bash
echo 'SERVER_DOMAIN=api.내도메인.com' | sudo tee /etc/caddy/caddy.env
sudo systemctl edit caddy       # [Service] 에 EnvironmentFile=/etc/caddy/caddy.env 추가
sudo systemctl restart caddy
```

DNS 에서 그 도메인의 A 레코드를 Elastic IP 로 향하게 해 두면, Caddy 가
**Let's Encrypt 인증서를 자동 발급**한다. 그 뒤 `PUBLIC_BASE_URL` 을
`https://api.내도메인.com` 으로 바꾸고 서버를 재배포한다.

EC2 기본 주소(`ec2-x-x-x-x.compute.amazonaws.com`)로는 인증서를 못 받는다.
Let's Encrypt 가 아마존 도메인에는 발급하지 않는다. 도메인을 사거나
DuckDNS 같은 무료 서브도메인을 써야 한다.

---

## 5. 배포 확인

```bash
curl http://<Elastic IP>/api/health        # 도메인 전
curl https://api.내도메인.com/api/health     # 도메인 후
```

워크플로도 배포 직후 VM 안에서 `/api/health` 를 12회까지 재시도하며 확인하고,
실패하면 `docker compose logs` 를 남기고 빨간불을 띄운다.

---

## 자주 막히는 곳

| 증상 | 원인 |
|---|---|
| SSH 접속이 안 된다 | 보안 그룹에 22번이 안 열렸거나 `.pem` 권한이 400이 아니다 |
| 배포가 조용히 건너뛴다 | GitHub Secrets 3개 중 하나가 비었다 (Actions 로그에 어느 것인지 나온다) |
| `docker compose` 권한 오류 | `setup.sh` 후 재접속을 안 했다 (docker 그룹 반영이 안 됨) |
| 인증서 발급 실패 | DNS A 레코드가 아직 Elastic IP 를 안 가리키거나, EC2 기본 도메인을 썼다 |
| 인스턴스 재시작 후 링크가 다 죽었다 | Elastic IP 를 안 붙였다 |
