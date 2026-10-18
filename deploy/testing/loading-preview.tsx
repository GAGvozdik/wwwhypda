// Isolated visual harness only; never imported by production.
import React,{useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {ModalProvider} from '../../wwwhypda-frontendV2/src/components/modal/modalContext';
import Login from '../../wwwhypda-frontendV2/src/components/users/auth/login';
import Register from '../../wwwhypda-frontendV2/src/components/users/auth/registration';
import ForgotPassword from '../../wwwhypda-frontendV2/src/components/users/auth/forgotPassword';
import Confirmation from '../../wwwhypda-frontendV2/src/components/users/auth/registrationConfirmation';
import AuthSkeleton from '../../wwwhypda-frontendV2/src/components/commonFeatures/authSkeleton';
import {AuthLoadingContext} from '../../wwwhypda-frontendV2/src/components/commonFeatures/authLoadingContext';
import styles from '../../wwwhypda-frontendV2/src/components/users/users.module.scss';
import '../../wwwhypda-frontendV2/src/components/menu.module.scss';
function Preview(){
 const [loading,setLoading]=useState(false),[dark,setDark]=useState(true),[measure,setMeasure]=useState('');
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  document.documentElement.dataset.theme=dark?'dark':'light';
  const update=()=>setMeasure(Array.from(root.current?.querySelectorAll('[data-fixture] [aria-busy]')||[]).filter(n=>n.parentElement?.dataset.fixture || n.parentElement?.parentElement?.dataset.fixture).map(n=>{const r=n.getBoundingClientRect();const spinner=n.querySelector('.MuiCircularProgress-root')?.getBoundingClientRect();return `${n.closest('[data-fixture]')?.getAttribute('data-fixture')}: ${r.width.toFixed(1)} × ${r.height.toFixed(1)}${spinner?` | центр ${((spinner.left+spinner.width/2)-(r.left+r.width/2)).toFixed(1)},${((spinner.top+spinner.height/2)-(r.top+r.height/2)).toFixed(1)}`:''}`;}).join(' | '));
  const observer=new ResizeObserver(update);if(root.current)observer.observe(root.current);update();window.addEventListener('resize',update);return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[loading,dark]);
 return <div ref={root} style={{padding:'1rem',fontFamily:'Afacad_Flux',background:'var(--body-color)',color:'var(--tree-text)',minHeight:'100vh',boxSizing:'border-box'}}>
 <h1>Проверка загрузки форм</h1><p>Введите текст и переключите загрузку. Ниже настоящие формы сайта. Отправку кода проверяйте отдельно на /login.</p>
 <button type="button" onClick={()=>setLoading(v=>!v)}>{loading?'Показать формы':'Показать загрузку'}</button> <button type="button" onClick={()=>setDark(v=>!v)}>Сменить тему</button><p role="status">{measure}</p>
 <AuthLoadingContext.Provider value={loading}><ModalProvider modalRootRef={root}>
 <div style={{display:'flex',flexWrap:'wrap',gap:'1rem',alignItems:'flex-start'}}>
 <section data-fixture="Логин" style={{width:"min(22.5rem,100%)",flex:"0 1 22.5rem",minWidth:0}}><Login/></section><section data-fixture="Регистрация" style={{width:"min(22.5rem,100%)",flex:"0 1 22.5rem",minWidth:0}}><Register/></section>
 <section data-fixture="Сброс пароля" style={{width:"min(22.5rem,100%)",flex:"0 1 22.5rem",minWidth:0}}><ForgotPassword/></section>
 <section data-fixture="Подтверждение" style={{width:"min(22.5rem,100%)",flex:"0 1 22.5rem",minWidth:0}}><AuthSkeleton><div className={styles.authForm}><h2 className={styles.formTitle}>Confirm your email</h2><Confirmation email="pending@example.test" onConfirmed={()=>{}} /></div></AuthSkeleton></section>
 </div></ModalProvider></AuthLoadingContext.Provider></div>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Preview/></MemoryRouter>);
