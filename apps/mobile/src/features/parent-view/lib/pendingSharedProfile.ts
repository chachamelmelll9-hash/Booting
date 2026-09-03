/**
 * 카카오톡 카드로 열린 프로필 — 코드 입력이 끝나면 이 화면으로 보낸다.
 *
 * 부모님이 카드의 버튼을 누른 이유는 **그 프로필을 보시려는 것**이다. 코드를
 * 넣었더니 목록만 나오면, 방금 무엇을 눌렀는지 다시 찾아야 한다.
 *
 * 저장하지 않고 메모리에만 둔다. 다음에 앱을 여실 때까지 남아 있으면 그때는
 * 카드를 누른 것이 아닌데도 그 프로필로 끌려간다.
 */
let pendingConnectionId: string | null = null;

export function setPendingSharedProfile(connectionId: string | null) {
  pendingConnectionId = connectionId;
}

/** 한 번 쓰고 비운다 — 다음 로그인까지 남아 있으면 안 된다 */
export function takePendingSharedProfile(): string | null {
  const id = pendingConnectionId;
  pendingConnectionId = null;
  return id;
}
