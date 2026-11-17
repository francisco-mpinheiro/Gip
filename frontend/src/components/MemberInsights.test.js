import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MemberInsights from './MemberInsights';
test('exibe formação cadastrada e carga a partir de tarefas reais',()=>{
 const html=renderToStaticMarkup(<MemberInsights user={{tasks:[{status:'a_fazer'},{status:'concluido'}],educations:[{id:'e1',degree:'Engenharia de Software',institution:'CEUB'}]}}/>);
 expect(html).toContain('Engenharia de Software');expect(html).toContain('Disponível');expect(html).toContain('1 tarefa ativa');
});
test('exibe estado sem formação e carga alta',()=>{
 const html=renderToStaticMarkup(<MemberInsights user={{tasks:Array.from({length:6},()=>({status:'em_andamento'}))}}/>);
 expect(html).toContain('Sem formação cadastrada');expect(html).toContain('Sobrecarregado');expect(html).toContain('6 tarefas ativas');
});
