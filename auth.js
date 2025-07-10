// ============================================================================
// ZAVIS 인증 관련 함수들
// 목적: 회원가입, 로그인, 로그아웃, 프로필 관리 등 사용자 인증 기능 구현
// ============================================================================

// 회원가입 함수 - 새로운 사용자 계정을 생성하고 프로필 정보를 저장
// 매개변수: email(이메일), password(비밀번호), name(이름), phone(전화번호)
async function signUp(email, password, name, phone) {
  try {
    // 회원가입 시도를 콘솔에 출력 (디버깅 용도)
    console.log('회원가입 시도:', email, name, phone);
    
    // 수파베이스 클라이언트가 초기화되었는지 확인
    // 클라이언트가 없으면 데이터베이스 연결이 불가능
    if (!supabaseClient) {
      throw new Error('수파베이스 클라이언트가 초기화되지 않았습니다.');
    }
    
    // 1. 수파베이스 Auth 서비스에 사용자 등록 (인증 계정 생성)
    // signUp 함수는 이메일과 비밀번호로 새로운 사용자 계정을 생성
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,     // 사용자 이메일 (로그인 ID로 사용)
      password: password, // 사용자 비밀번호 (암호화되어 저장)
      options: {
        // 이메일 인증 후 리디렉션될 URL 설정 (GitHub Pages 호환)
        emailRedirectTo: `https://bcshine.github.io/ZAVIS-login-auth/auth-confirm.html`,
        // 사용자 메타데이터 설정 (프로필 생성 시 활용)
        data: {
          name: name,
          phone: phone
        }
      }
    });
    
    // 인증 계정 생성 중 오류가 발생했는지 확인
    if (authError) {
      throw authError; // 오류 발생 시 catch 블록으로 이동
    }
    
    // 사용자 계정 생성 확인
    if (!authData.user || !authData.user.id) {
      throw new Error('사용자 계정 생성에 실패했습니다.');
    }
    
    // 인증 계정 생성 완료를 콘솔에 출력 (디버깅 용도)
    console.log('Auth 사용자 생성 완료:', authData.user.id);
    
    // 2. 모바일 환경 최적화 - 단순한 프로필 생성 (트리거 의존성 제거)
    console.log('모바일 환경 최적화: 직접 프로필 생성 시도...');
    
    // 프로필 생성 시도 (모바일 환경 최적화)
    let profileCreated = false;
    
    try {
      // 직접 프로필 생성 시도
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          user_id: authData.user.id,
          name: name,
          phone: phone,
          email: email,
          visit_count: 1
        }])
        .select()
        .single();
      
      if (profileError) {
        console.error('직접 프로필 생성 오류:', profileError);
        
        // 중복 오류인 경우 기존 프로필 업데이트
        if (profileError.code === '23505') {
          console.log('프로필이 이미 존재, 업데이트 시도...');
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
              name: name,
              phone: phone
            })
            .eq('user_id', authData.user.id);
          
          if (updateError) {
            console.error('프로필 업데이트 오류:', updateError);
          } else {
            console.log('기존 프로필 업데이트 완료');
            profileCreated = true;
          }
        } else {
          // 프로필 생성이 실패한 경우 Edge Function 사용 시도
          console.log('프로필 생성 실패, Edge Function 백업 시도...');
          throw new Error(`프로필 생성 실패: ${profileError.message}`);
        }
      } else {
        console.log('직접 프로필 생성 완료');
        profileCreated = true;
      }
    } catch (error) {
      console.error('프로필 생성 중 예외:', error);
      
      // 모바일 환경에서 Edge Function 백업 시도
      if (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPhone')) {
        console.log('모바일 환경 감지, Edge Function 백업 시도...');
        
        try {
          const response = await fetch(`${supabaseClient.supabaseUrl}/functions/v1/mobile-signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseClient.supabaseKey}`
            },
            body: JSON.stringify({
              email: email,
              password: password,
              name: name,
              phone: phone
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('Edge Function 백업 성공');
            profileCreated = true;
          } else {
            console.error('Edge Function 백업 실패:', result.error);
          }
        } catch (edgeError) {
          console.error('Edge Function 호출 오류:', edgeError);
        }
      }
      
      // 프로필 생성 실패해도 회원가입은 성공으로 처리
      console.log('프로필 생성 실패, 하지만 회원가입은 성공으로 처리');
    }
    
    // 프로필 생성 상태 확인
    if (!profileCreated) {
      console.log('프로필 생성 실패, 하지만 회원가입은 성공으로 처리');
    }
    
    // 로컬 스토리지에 사용자 정보 임시 저장 (이메일 인증 전이므로 임시)
    // 이메일 인증 완료 후 정식 로그인 시 정식 저장으로 변경됨
    localStorage.setItem('zavis-user-info-temp', JSON.stringify({
      name: name,           // 사용자 이름
      email: email,         // 이메일 주소
      visit_count: 1        // 방문횟수 초기값
    }));
    
    // 회원가입 성공 메시지 표시 (이메일 인증 안내 포함)
    const successMessage = profileCreated 
      ? `🎉 회원가입이 완료되었습니다!\n\n📧 ${email}로 보낸 인증 메일을 확인해주세요.\n\n✅ 이메일 인증을 완료해야 로그인할 수 있습니다.\n\n📱 스팸메일함도 확인해보세요!`
      : `🎉 회원가입이 완료되었습니다!\n\n📧 ${email}로 보낸 인증 메일을 확인해주세요.\n\n✅ 이메일 인증을 완료해야 로그인할 수 있습니다.\n\n📱 스팸메일함도 확인해보세요!\n\n⚠️ 프로필 정보는 첫 로그인 시 자동으로 생성됩니다.`;
    
    alert(successMessage);
    
    // 회원가입 성공 결과 반환
    return { success: true, user: authData.user };
    
  } catch (error) {
    // 회원가입 중 발생한 오류를 콘솔에 출력 (디버깅 용도)
    console.error('회원가입 오류:', error);
    
    // 모바일 환경에서도 정확한 오류 메시지 제공
    let errorMessage = '회원가입 중 오류가 발생했습니다.';
    
    // 오류 유형에 따른 구체적인 메시지 제공
    if (error.message) {
      if (error.message.includes('User already registered') || error.message.includes('already registered')) {
        errorMessage = '이미 등록된 이메일입니다.';
      } else if (error.message.includes('Password')) {
        errorMessage = '비밀번호가 너무 짧습니다. (최소 6자)';
      } else if (error.message.includes('Email')) {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      } else if (error.message.includes('profile') || error.message.includes('권한')) {
        errorMessage = '프로필 생성 권한이 부족합니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('insert') || error.message.includes('INSERT')) {
        errorMessage = '프로필 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('permission') || error.message.includes('Permission')) {
        errorMessage = '권한이 부족합니다. 잠시 후 다시 시도해주세요.';
      } else {
        // 모바일에서 발생하는 모든 오류를 안전하게 처리
        errorMessage = `회원가입 중 문제가 발생했습니다: ${error.message}`;
      }
    }
    
    // 모바일에서도 안정적으로 오류 표시
    console.log('최종 오류 메시지:', errorMessage);
    alert(errorMessage);
    
    // 회원가입 실패 결과 반환
    return { success: false, error: error.message };
  }
}

// 로그인 함수 - 기존 사용자의 이메일과 비밀번호로 로그인 처리
// 매개변수: email(이메일), password(비밀번호)
async function signIn(email, password) {
  try {
    // 로그인 시도를 콘솔에 출력 (디버깅 용도)
    console.log('로그인 시도:', email);
    
    // 수파베이스 클라이언트가 초기화되었는지 확인
    // 클라이언트가 없으면 데이터베이스 연결이 불가능
    if (!supabaseClient) {
      console.error('수파베이스 클라이언트가 초기화되지 않았습니다.');
      alert('시스템 초기화가 완료되지 않았습니다. 페이지를 새로고침 후 다시 시도해주세요.');
      return { success: false, error: 'Client not initialized' };
    }
    
    // 입력값 검증 - 이메일과 비밀번호가 모두 입력되었는지 확인
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요.');
      return { success: false, error: 'Missing credentials' };
    }
    
    // 수파베이스 Auth 로그인 시도 시작을 콘솔에 출력
    console.log('수파베이스 Auth 로그인 시도...');
    
    // 1. 수파베이스 Auth 서비스를 통한 로그인 시도
    // signInWithPassword 함수는 이메일과 비밀번호로 사용자 인증
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: email,         // 사용자 이메일
      password: password    // 사용자 비밀번호
    });
    
    // 인증 과정에서 오류가 발생했는지 확인
    if (authError) {
      console.error('Auth 로그인 오류:', authError);
      throw authError;  // 오류 발생 시 catch 블록으로 이동
    }
    
    // 로그인은 성공했지만 사용자 정보가 없는 경우 확인
    if (!authData.user) {
      console.error('로그인 성공했지만 사용자 정보가 없습니다.');
      throw new Error('사용자 정보를 받지 못했습니다.');
    }
    
    // 로그인 성공을 콘솔에 출력 (디버깅 용도)
    console.log('로그인 성공:', authData.user.id);
    
    // 2. 프로필 정보 가져오기
    // Auth 테이블에는 기본 정보만 있으므로 profiles 테이블에서 상세 정보를 가져옴
    console.log('프로필 정보 가져오기 시도...');
    const { data: currentProfile, error: fetchError } = await supabaseClient
      .from('profiles')                    // profiles 테이블 선택
      .select('*')                        // 모든 컬럼 선택
      .eq('user_id', authData.user.id)    // 현재 사용자의 프로필만 선택
      .single();                          // 단일 레코드 반환
    
    // 프로필 정보 가져오기 중 오류가 발생한 경우
    if (fetchError) {
      console.error('프로필 정보 가져오기 오류:', fetchError);
      // 프로필 정보가 없어도 로그인은 성공으로 처리 (유연한 오류 처리)
      alert('🎉 로그인 성공!\n\n프로필 정보를 불러오는 중 오류가 발생했습니다.\n메인 페이지로 이동합니다.');
      window.location.href = 'index.html';
      return { success: true, user: authData.user };
    }
    
    // 프로필 정보가 존재하지 않는 경우
    if (!currentProfile) {
      console.error('프로필 정보가 없습니다.');
      alert('🎉 로그인 성공!\n\n프로필 정보를 찾을 수 없습니다.\n메인 페이지로 이동합니다.');
      window.location.href = 'index.html';
      return { success: true, user: authData.user };
    }
    
    // 프로필 정보 로드 완료를 콘솔에 출력
    console.log('프로필 정보 로드 완료:', currentProfile);
    
    // 3. 방문횟수 증가 처리
    // 현재 방문횟수에서 1을 더한 값으로 업데이트
    const newVisitCount = (currentProfile.visit_count || 0) + 1;
    console.log('방문횟수 업데이트:', newVisitCount);
    
    // 데이터베이스의 방문횟수 컬럼 업데이트
    const { error: updateError } = await supabaseClient
      .from('profiles')                       // profiles 테이블 선택
      .update({ visit_count: newVisitCount }) // 방문횟수 업데이트
      .eq('user_id', authData.user.id);       // 현재 사용자의 레코드만 업데이트
    
    // 방문횟수 업데이트 중 오류가 발생한 경우
    if (updateError) {
      console.error('방문횟수 업데이트 오류:', updateError);
      // 방문횟수 업데이트 실패해도 로그인은 성공으로 처리 (유연한 오류 처리)
    }
    
    // 4. 로컬 스토리지에 사용자 정보 저장
    // 다음 방문 시 빠른 로딩을 위해 사용자 정보를 브라우저에 저장
    try {
      localStorage.setItem('zavis-user-info', JSON.stringify({
        name: currentProfile.name,      // 사용자 이름
        email: currentProfile.email,    // 이메일 주소
        visit_count: newVisitCount      // 업데이트된 방문횟수
      }));
      console.log('로컬 스토리지에 사용자 정보 저장 완료');
    } catch (storageError) {
      // 로컬 스토리지 저장 실패 시 콘솔에 오류 출력
      console.error('로컬 스토리지 저장 오류:', storageError);
    }
    
    // 로그인 성공 메시지 표시
    alert('🎉 로그인 성공!\n\n환영합니다! ZAVIS와 함께 성공적인 비즈니스를 시작해보세요.');
    
    // 메인 페이지로 리디렉션 (페이지 이동)
    window.location.href = 'index.html';
    
    // 로그인 성공 결과 반환
    return { success: true, user: authData.user };
    
  } catch (error) {
    // 로그인 과정에서 발생한 오류의 상세 정보를 콘솔에 출력
    console.error('로그인 오류 상세:', error);
    
    // 구체적인 오류 메시지 제공 (사용자 친화적)
    let errorMessage = '로그인 중 오류가 발생했습니다.';
    
    // 오류 메시지에 따라 구체적인 안내 메시지 제공
    if (error.message) {
      if (error.message.includes('Email not confirmed')) {
        // 이메일 인증이 완료되지 않은 경우
        errorMessage = '📧 이메일 인증이 완료되지 않았습니다!\n\n✅ 회원가입 시 사용한 이메일을 확인하여 인증을 완료해주세요.\n\n📱 스팸메일함도 확인해보세요!\n\n❓ 인증 메일이 없다면 회원가입을 다시 시도해주세요.';
      } else if (error.message.includes('Invalid login credentials')) {
        // 이메일 또는 비밀번호가 잘못된 경우
        errorMessage = '❌ 이메일 또는 비밀번호가 잘못되었습니다.\n\n🔍 입력한 정보를 다시 확인해주세요.\n\n📝 회원가입을 하지 않으셨다면 먼저 회원가입을 해주세요.';
      } else if (error.message.includes('Too many requests')) {
        // 너무 많은 로그인 시도로 인한 일시적 차단
        errorMessage = '⏰ 너무 많은 로그인 시도로 인해 일시적으로 차단되었습니다.\n\n잠시 후 다시 시도해주세요.';
      } else {
        // 기타 오류의 경우 원본 오류 메시지 표시
        errorMessage = `로그인 중 오류가 발생했습니다:\n${error.message}`;
      }
    }
    
    // 사용자에게 오류 메시지 표시
    alert(errorMessage);
    // 로그인 실패 결과 반환
    return { success: false, error: error.message };
  }
}

// 로그아웃 함수 - 현재 로그인된 사용자를 로그아웃 처리
// 매개변수: 없음
async function signOut() {
  try {
    // 로그아웃 시도 시작을 콘솔에 출력 (디버깅 용도)
    console.log('로그아웃 시도');
    
    // 수파베이스 클라이언트가 초기화되었는지 확인
    // 클라이언트가 없으면 로그아웃 처리 불가능
    if (!supabaseClient) {
      throw new Error('수파베이스 클라이언트가 초기화되지 않았습니다.');
    }
    
    // 수파베이스 Auth 서비스를 통한 로그아웃 처리
    // signOut 함수는 현재 세션을 무효화하고 로그인 상태를 해제
    const { error } = await supabaseClient.auth.signOut();
    
    // 로그아웃 과정에서 오류가 발생했는지 확인
    if (error) {
      throw error;  // 오류 발생 시 catch 블록으로 이동
    }
    
    // 로그아웃 성공을 콘솔에 출력 (디버깅 용도)
    console.log('로그아웃 성공');
    
    // 로컬 스토리지에서 사용자 정보 완전 삭제
    // 정식 사용자 정보와 임시 사용자 정보 모두 삭제
    localStorage.removeItem('zavis-user-info');      // 정식 로그인 후 저장된 정보
    localStorage.removeItem('zavis-user-info-temp'); // 회원가입 후 임시 저장된 정보
    
    // 현재 페이지가 메인 페이지가 아닌 경우에만 리디렉션
    // 메인 페이지에서 로그아웃한 경우 페이지 이동 없이 UI만 업데이트
    const currentPage = window.location.pathname;
    if (!currentPage.includes('index.html') && currentPage !== '/' && currentPage !== '') {
      window.location.href = 'index.html';  // 메인 페이지로 이동
    }
    
    // 로그아웃 성공 결과 반환
    return { success: true };
    
  } catch (error) {
    // 로그아웃 과정에서 발생한 오류를 콘솔에 출력
    console.error('로그아웃 오류:', error);
    // 사용자에게 오류 메시지 표시
    alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
    // 로그아웃 실패 결과 반환
    return { success: false, error: error.message };
  }
}

// 현재 사용자 정보 가져오기 함수 - 현재 로그인된 사용자의 정보를 가져옴
// 매개변수: 없음
// 반환값: 사용자 정보 객체 또는 null
async function getCurrentUser() {
  try {
    // 현재 사용자 정보 가져오기 시도를 콘솔에 출력 (디버깅 용도)
    console.log('현재 사용자 정보 가져오기 시도');
    
    // 수파베이스 클라이언트가 초기화되었는지 확인
    // 클라이언트가 없으면 사용자 정보 조회 불가능
    if (!supabaseClient) {
      console.error('수파베이스 클라이언트가 초기화되지 않았습니다.');
      return null;  // null 반환으로 로그인되지 않은 상태 표시
    }
    
    // 현재 인증된 사용자 정보 가져오기
    // getUser 함수는 현재 유효한 세션의 사용자 정보를 반환
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    // 사용자 정보 가져오기 중 오류가 발생한 경우
    if (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      return null;  // 오류 발생 시 null 반환
    }
    
    // 사용자 정보가 없는 경우 (로그인되지 않은 상태)
    if (!user) {
      console.log('로그인되지 않은 상태');
      return null; // 로그인되지 않은 상태
    }
    
    // 인증된 사용자 발견을 콘솔에 출력
    console.log('인증된 사용자 발견:', user.email);
    
    // 프로필 정보 가져오기
    // Auth 테이블에는 기본 정보만 있으므로 profiles 테이블에서 상세 정보 조회
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')           // profiles 테이블 선택
      .select('*')               // 모든 컬럼 선택
      .eq('user_id', user.id)    // 현재 사용자의 프로필만 선택
      .single();                 // 단일 레코드 반환
    
    // 프로필 정보 가져오기 중 오류가 발생한 경우
    if (profileError) {
      console.error('프로필 정보 가져오기 오류:', profileError);
      // 사용자 정보는 있지만 프로필 정보가 없는 경우
      return { user: user, profile: null };
    }
    
    // 프로필 데이터가 존재하지 않는 경우
    if (!profileData) {
      console.error('프로필 데이터가 없습니다.');
      // 사용자 정보는 있지만 프로필 정보가 없는 경우
      return { user: user, profile: null };
    }
    
    // 프로필 정보 로드 완료를 콘솔에 출력
    console.log('프로필 정보 로드 완료:', profileData.name);
    // 사용자 정보와 프로필 정보를 모두 포함한 객체 반환
    return { user: user, profile: profileData };
    
  } catch (error) {
    // 현재 사용자 정보 가져오기 과정에서 발생한 오류를 콘솔에 출력
    console.error('현재 사용자 정보 가져오기 오류:', error);
    return null;  // 오류 발생 시 null 반환
  }
}

// 로그인 상태 확인 및 UI 업데이트 함수
// 현재 사용자의 로그인 상태를 확인하고 사용자 정보를 반환
// 매개변수: 없음
// 반환값: 사용자 정보 객체 또는 null
async function checkAuthStatus() {
  try {
    // 인증 상태 확인 시작을 콘솔에 출력 (디버깅 용도)
    console.log('인증 상태 확인 시작');
    
    // 수파베이스 클라이언트가 초기화되었는지 확인
    // 클라이언트가 없으면 인증 상태 확인 불가능
    if (!supabaseClient) {
      console.error('수파베이스 클라이언트가 초기화되지 않았습니다.');
      return null;  // null 반환으로 로그인되지 않은 상태 표시
    }
    
    // getCurrentUser 함수를 호출하여 현재 사용자 정보 가져오기
    const userData = await getCurrentUser();
    
    // 사용자 정보가 존재하는 경우 (로그인된 상태)
    if (userData && userData.user) {
      // 프로필 이름이 있으면 이름을, 없으면 이메일을 출력
      console.log('로그인된 사용자:', userData.profile?.name || userData.user.email);
      return userData;  // 사용자 정보 반환
    } else {
      // 사용자 정보가 없는 경우 (로그인되지 않은 상태)
      console.log('로그인되지 않은 상태');
      return null;  // null 반환
    }
    
  } catch (error) {
    // 인증 상태 확인 과정에서 발생한 오류를 콘솔에 출력
    console.error('인증 상태 확인 오류:', error);
    return null;  // 오류 발생 시 null 반환
  }
}

// ============================================================================
// 페이지 로드 시 자동 실행 코드
// ============================================================================

// 페이지 로드 시 인증 상태 확인 (index.html 제외)
// DOMContentLoaded 이벤트는 HTML 문서가 완전히 로드되고 파싱된 후에 발생
document.addEventListener('DOMContentLoaded', function() {
  // index.html은 자체적으로 인증 상태를 관리하므로 여기서는 체크하지 않음
  // 중복 실행을 방지하기 위해 현재 페이지가 메인 페이지인지 확인
  const currentPage = window.location.pathname;
  if (currentPage.includes('index.html') || currentPage === '/' || currentPage === '') {
    return;  // 메인 페이지인 경우 함수 종료
  }
  
  // 다른 페이지(로그인, 회원가입 등)에서만 인증 상태 확인
  // 100ms 후에 실행하여 수파베이스 클라이언트 초기화 완료 대기
  setTimeout(checkAuthStatus, 100);
}); 