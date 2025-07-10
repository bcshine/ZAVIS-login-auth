// ============================================================================
// ZAVIS 웹앱 수파베이스 연동 설정 파일
// 프로젝트: SB-Zavis-01 (ZAVIS 로그인 인증 시스템)
// 목적: 수파베이스 데이터베이스와 인증 시스템을 연결하기 위한 설정
// ============================================================================

// 수파베이스 프로젝트 연결 정보를 담은 설정 객체
const supabaseConfig = {
  // 수파베이스 프로젝트 URL - 데이터베이스 서버의 주소
  url: 'https://uscvzvmtskestpyrhuhe.supabase.co',
  
  // 수파베이스 익명 키 (공개 가능한 키) - 클라이언트에서 데이터베이스에 접근할 때 사용
  // 이 키는 브라우저에서 볼 수 있으므로 보안이 중요한 작업에는 사용하지 않음
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzY3Z6dm10c2tlc3RweXJodWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMDkyNjIsImV4cCI6MjA2NzY4NTI2Mn0.fGMLp-DirDyejS_axAta76k0O1lJCPRAKDIAxVd9tUc',
  
  // 프로젝트 ID - 수파베이스 프로젝트를 식별하는 고유한 문자열
  projectId: 'uscvzvmtskestpyrhuhe'
};

// 수파베이스 클라이언트를 초기화하는 함수
// 이 함수는 수파베이스 서버와 연결하는 클라이언트 객체를 생성함
function initSupabase() {
  // 수파베이스 라이브러리가 HTML에서 정상적으로 로드되었는지 확인
  // 만약 라이브러리가 로드되지 않았다면 오류 메시지를 출력하고 null 반환
  if (typeof supabase === 'undefined') {
    console.error('수파베이스 라이브러리가 로드되지 않았습니다.');
    return null;
  }
  
  // 수파베이스 클라이언트 생성 (로그인 안정성을 우선으로 설정)
  // createClient 함수는 수파베이스 서버와 통신할 수 있는 클라이언트 객체를 만듦
  const client = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      // 자동 리프레시 토큰 활성화 - 로그인 세션이 만료되기 전에 자동으로 갱신
      // 이 설정으로 사용자가 로그인 상태를 유지할 수 있음
      autoRefreshToken: true,
      // 세션 지속 - 브라우저를 닫았다가 다시 열어도 로그인 상태 유지
      // 로컬 스토리지에 로그인 정보를 저장하여 지속성 제공
      persistSession: true,
      // 토큰 감지 활성화 - URL에 포함된 인증 토큰을 자동으로 감지
      // 이메일 인증 후 리다이렉트 시 토큰을 자동으로 처리
      detectSessionInUrl: true
    }
  });
  
  // 생성된 클라이언트 객체를 반환하여 다른 곳에서 사용할 수 있도록 함
  return client;
}

// 전역 변수로 수파베이스 클라이언트 저장
// 애플리케이션 전체에서 하나의 클라이언트 인스턴스를 공유하여 사용
let supabaseClient = null;
// 수파베이스 초기화 상태를 추적하는 플래그 변수
// 중복 초기화를 방지하기 위해 사용
let supabaseInitialized = false;

// 페이지 로드 시 수파베이스 초기화 (한 번만 실행)
// DOMContentLoaded 이벤트는 HTML 문서가 완전히 로드되고 파싱된 후에 발생
document.addEventListener('DOMContentLoaded', function() {
  // 이미 초기화되었는지 확인하여 중복 초기화 방지
  if (!supabaseInitialized) {
    // 초기화 플래그를 true로 설정하여 다시 초기화되지 않도록 함
    supabaseInitialized = true;
    // initSupabase 함수를 호출하여 수파베이스 클라이언트 생성
    supabaseClient = initSupabase();
  }
}); 