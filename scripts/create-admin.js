const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hubpmhyiuzyllkgjzjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnBtaHlpdXp5bGxrZ2p6am9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTYyMTEsImV4cCI6MjA4NjA3MjIxMX0.sunGcTj1_wM8Ad3ISnUdU4wk4nUpRnM3CKu4aJp4IYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = 'admin@admin.com';
  const password = 'admin@admin';

  console.log(`1. Tentando fazer login como ${email}...`);
  let { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  let session = loginData?.session;
  let user = loginData?.user;

  if (loginError) {
    console.log(`Login falhou: ${loginError.message}. Tentando cadastrar usuário...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: 'Admin'
        }
      }
    });

    if (signUpError) {
      console.error('Erro ao cadastrar usuário:', signUpError.message);
      process.exit(1);
    }

    console.log('Usuário cadastrado com sucesso!');
    user = signUpData.user;
    session = signUpData.session;

    // Se o signup não logou automaticamente, tenta logar novamente
    if (!session) {
      console.log('Efetuando login após cadastro...');
      const { data: reloginData, error: reloginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (reloginError) {
        console.error('Erro ao logar após cadastro:', reloginError.message);
        process.exit(1);
      }
      user = reloginData.user;
      session = reloginData.session;
    }
  } else {
    console.log('Login efetuado com sucesso (usuário já existia)!');
  }

  // Cria cliente autenticado
  const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await authSupabase.auth.setSession(session);

  console.log('2. Buscando a organização "Hybex"...');
  const { data: orgs, error: orgsError } = await authSupabase
    .from('organizations')
    .select('id, name, slug');

  if (orgsError) {
    console.error('Erro ao buscar organizações:', orgsError.message);
    process.exit(1);
  }

  console.log('Organizações encontradas:', orgs);

  const hybexOrg = orgs.find(o => o.name.toLowerCase() === 'hybex' || o.slug.toLowerCase() === 'hybex');

  if (!hybexOrg) {
    console.error('Organização "Hybex" não encontrada no banco de dados!');
    process.exit(1);
  }

  console.log(`Organização "Hybex" encontrada com ID: ${hybexOrg.id}`);

  console.log(`3. Vinculando o usuário ${email} à organização Hybex...`);
  
  // Tenta inserir como 'admin'
  const { data: memberData, error: memberError } = await authSupabase
    .from('org_members')
    .insert({
      org_id: hybexOrg.id,
      user_id: user.id,
      role: 'admin'
    })
    .select();

  if (memberError) {
    // Se der erro por já existir ou outro motivo, reporta
    if (memberError.code === '23505') {
      console.log('Usuário já é membro da organização Hybex!');
    } else {
      console.error('Erro ao vincular usuário à organização:', memberError.message, memberError.code);
      process.exit(1);
    }
  } else {
    console.log('Usuário vinculado à organização Hybex com sucesso!', memberData);
  }

  console.log('Operação concluída com sucesso!');
}

run().catch(err => {
  console.error('Erro não tratado na execução:', err);
  process.exit(1);
});
