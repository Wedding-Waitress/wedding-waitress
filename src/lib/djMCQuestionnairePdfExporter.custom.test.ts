import {it,expect,vi} from 'vitest';
const saved=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/pdfExportUtils',()=>({PDF_DEFAULT_OPTIONS:{},savePdfAsync:saved,yieldToBrowser:async()=>{}}));
import {exportSectionPDF,exportEntireQuestionnairePDF} from './djMCQuestionnairePdfExporter';
it('exports custom headings and cell content in section and entire PDFs',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
 const section:any={section_type:'cocktail',section_label:'Custom Section',custom_columns:[{id:'row_label',source:'row_label',label:'Person'},{id:'extra',label:'Instructions'}],items:[{row_label:'Alice',custom_values:{extra:'Bring flowers'}}]};
 const event:any={name:'Test Wedding',date:'2027-09-05'};
 await exportSectionPDF(section,event,'larger');
 await exportEntireQuestionnairePDF({sections:[section]} as any,event,'larger');
 for(const [pdf] of saved.mock.calls){const content=pdf.internal.pages.flat().join(' ');expect(content).toContain('Person');expect(content).toContain('Instructions');expect(content).toContain('Alice');expect(content).toContain('Bring flowers');expect(content).toContain('10 Tf');expect(pdf.getNumberOfPages()).toBe(1);}
 vi.unstubAllGlobals();
});
