import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LoginPage from './LoginPage';
import { authAPI } from '../utils/api';
jest.mock('../context/AuthContext',()=>({useAuth:()=>({login:jest.fn(),register:jest.fn()})}));
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn()}));
jest.mock('../utils/api',()=>({authAPI:{forgotPassword:jest.fn()}}));
let root,host;
beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);act(()=>root.render(<LoginPage/>));});
afterEach(()=>{act(()=>root.unmount());host.remove();jest.clearAllMocks();});
test('link abre recuperação na própria tela e permite voltar',()=>{
  const link=Array.from(host.querySelectorAll('button,a')).find(e=>e.textContent==='Esqueceu a senha?');
  expect(link).toBeTruthy();act(()=>link.click());expect(host.textContent).toContain('Enviar link');
  act(()=>Array.from(host.querySelectorAll('button')).find(e=>e.textContent==='Voltar').click());expect(host.textContent).toContain('Email ou CPF');
});
test('recuperação exibe falha da API em vez de sucesso',async()=>{
  const link=Array.from(host.querySelectorAll('button,a')).find(e=>e.textContent==='Esqueceu a senha?');expect(link).toBeTruthy();act(()=>link.click());
  authAPI.forgotPassword.mockRejectedValue({response:{data:{message:'Serviço indisponível'}}});
  await act(async()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(host.textContent).toContain('Serviço indisponível');expect(host.textContent).not.toContain('um link será enviado');
});
