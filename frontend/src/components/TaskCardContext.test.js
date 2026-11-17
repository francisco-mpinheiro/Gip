import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskCardAssignee, TaskCardCounts } from './TaskCardContext';
test('mostra foto e nome acessível do responsável',()=>{
 const html=renderToStaticMarkup(<TaskCardAssignee assignee={{name:'Ana Silva',avatar:'/uploads/ana.png'}}/>);
 expect(html).toContain('/uploads/ana.png');expect(html).toContain('Ana Silva');
});
test('gera iniciais quando o responsável não tem foto',()=>{
 expect(renderToStaticMarkup(<TaskCardAssignee assignee={{name:'Ana Silva'}}/>)).toContain('AS');
});
test('mostra apenas contadores positivos',()=>{
 const html=renderToStaticMarkup(<TaskCardCounts counts={{comments:2,attachments:1}}/>);
 expect(html).toContain('2 comentários');expect(html).toContain('1 anexo');
 expect(renderToStaticMarkup(<TaskCardCounts counts={{comments:0,attachments:0}}/>)).toBe('');
});
test('sem permissão informa ausência de responsável sem oferecer atribuição',()=>{
 const html=renderToStaticMarkup(<TaskCardAssignee/>);expect(html).toContain('Sem responsável');expect(html).not.toContain('button');
});
test('atribuição rápida não abre o detalhe do card',()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);const parent=jest.fn(),assign=jest.fn();
 try{act(()=>root.render(<div onClick={parent}><TaskCardAssignee onAssign={assign}/></div>));act(()=>host.querySelector('button').click());expect(assign).toHaveBeenCalledTimes(1);expect(parent).not.toHaveBeenCalled();}finally{act(()=>root.unmount());host.remove();}
});
