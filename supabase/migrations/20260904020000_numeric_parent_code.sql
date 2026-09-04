-- 부모님 접속 코드를 숫자로만 바꾼다.
--
-- 영문이 섞이면 어르신께는 그 자체가 벽이다. 대소문자를 가려 눌러야 하고,
-- 전화로 불러 줄 때 "비(B)요 디(D)요" 를 되묻게 된다. 숫자는 전화번호로 평생
-- 다뤄 오신 형식이라 헷갈릴 일이 없다.
--
-- 대신 **여섯 자리가 아니라 여덟 자리**다. 숫자 6자리는 100만 가지뿐이라 남의
-- 부모님 프로필(사진과, 성사되면 연락처까지)이 무작위 대입으로 열릴 수 있다.
-- 8자리면 1억 가지가 되고, 로그인 시도 제한과 함께 걸면 현실적으로 막힌다.
-- 자릿수가 둘 늘어도 숫자라 부담은 오히려 줄어든다.
create or replace function generate_parent_access_code() returns text as $$
declare
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || floor(random() * 10)::int::text;
  end loop;
  return result;
end;
$$ language plpgsql volatile;

comment on column parent_profiles.access_code is
  '부모님 접속 코드 숫자 8자리. 자녀 화면에서 확인해 부모님께 알려준다. 만료 없음.';

-- 이미 발급된 영문 섞인 코드를 숫자로 다시 뽑는다.
--
-- 이미 알려드린 코드가 바뀐다. 그래도 지금 바꾸는 편이 낫다 — 쓰는 분이 늘어난
-- 뒤에는 바꾸지 못하고, 그때는 어려운 코드를 계속 쓰시게 된다.
do $$
declare
  row_id uuid;
  new_code text;
begin
  for row_id in select id from parent_profiles where access_code !~ '^[0-9]{8}$' or access_code is null loop
    loop
      new_code := generate_parent_access_code();
      exit when not exists (select 1 from parent_profiles where access_code = new_code);
    end loop;
    update parent_profiles set access_code = new_code where id = row_id;
  end loop;
end $$;
