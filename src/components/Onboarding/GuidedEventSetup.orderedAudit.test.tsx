import React from 'react';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,Route,Routes,useNavigate} from 'react-router-dom';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {GuidedSetupAnswers,GuidedSetupDraft} from '@/lib/guidedEventSetup';
const m=vi.hoisted(()=>({answers:{} as GuidedSetupAnswers,step:1,save:vi.fn(),complete:vi.fn(),failSave:false,plan:{guest_limit:100,table_limit:20,status:'active',is_read_only:false,expires_at:null} as any}));
vi.mock('@/contexts/AuthenticatedSessionContext',()=>({useAuthenticatedSession:()=>({session:{user:{id:'audit-owner'}}})}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>({profile:{first_name:'Audit',last_name:'Example'},loading:false})}));
vi.mock('@/hooks/useUserPlan',()=>({useUserPlan:()=>({plan:m.plan,loading:false})}));
vi.mock('@/hooks/useIsAdmin',()=>({useIsAdmin:()=>({isAdmin:false,loading:false})}));
vi.mock('@/components/Subscription/UpgradePlanModal',()=>({UpgradePlanModal:()=> <h2>Package selection</h2>}));
vi.mock('./OnboardingAudio',()=>({OnboardingAudio:()=>null}));
// The real image editor has its own upload/pointer/keyboard tests. Keep this
// ordered form audit focused on routing, validation and draft persistence.
vi.mock('@/components/EventImage/EventImageEditor',()=>({EventImageEditor:({heading}:any)=><section aria-label={heading}/>,EventImagePreview:()=> <div>Saved photo preview</div>}));
vi.mock('@/lib/guidedEventSetup',async(importOriginal)=>{
 const actual=await importOriginal<typeof import('@/lib/guidedEventSetup')>();
 const draft=():GuidedSetupDraft=>({id:'audit-draft',user_id:'audit-owner',mode:'first_event',answers:{...m.answers},current_step:m.step,created_event_id:null,creation_started_at:null,completed_at:null,created_at:'2026-10-31T00:00:00Z',updated_at:'2026-10-31T00:00:00Z'});
 return {...actual,loadActiveGuidedSetup:vi.fn(async()=>draft()),beginGuidedSetup:vi.fn(async()=>draft()),saveGuidedSetup:vi.fn(async(_id:string,answers:GuidedSetupAnswers,step:number)=>{if(m.failSave)throw Error('Audit save unavailable');m.answers={...answers};m.step=step;m.save(answers,step);return draft();}),completeGuidedSetup:m.complete};
});
import {GuidedEventSetup} from './GuidedEventSetup';
function History(){const n=useNavigate();return <><button onClick={()=>n(-1)}>History Back</button><button onClick={()=>n(1)}>History Forward</button></>}
const mount=(step=m.step)=>render(<MemoryRouter initialEntries={[`/onboarding/event-setup?mode=first&step=${step}`]}><History/><Routes><Route path='/onboarding/event-setup' element={<GuidedEventSetup/>}/><Route path='/dashboard' element={<h1>My Events workspace</h1>}/></Routes></MemoryRouter>);
const next=async()=>fireEvent.click(await screen.findByRole('button',{name:/^Next$/}));
const field=(label:string)=>{const items=screen.getAllByLabelText(new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));return items.find(el=>el.id.startsWith('guided-'))??items[0];};
const change=(label:string,value:string)=>fireEvent.change(field(label),{target:{value}});
const ready=()=>({celebrationType:'wedding',customerFirstName:'Audit',partnerFirstName:'Partner',eventName:'Audit Event',dateChoice:'undecided',locationChoice:'undecided',partsChoice:'reception-only',eventFormat:'seated',approximateInvited:'50',expectedAttending:'40',tableCreation:'later',budgetChoice:'25000-30000'} as GuidedSetupAnswers);
beforeEach(()=>{m.answers={};m.step=1;m.save.mockClear();m.complete.mockReset().mockResolvedValue('audit-event');m.failSave=false;m.plan={guest_limit:100,table_limit:20,status:'active',is_read_only:false,expires_at:null};HTMLElement.prototype.scrollIntoView=vi.fn();window.requestAnimationFrame=fn=>{fn(0);return 1;};});
describe('ordered onboarding audit',()=>{
 it.each(['corporate','school','christmas','other'] as const)('page 2 details: %s organiser/organisation fields remain editable and save',async(celebrationType)=>{
  m.answers={celebrationType,otherEventType:'Anniversary'};mount(3);await screen.findByText('Step 3 of 10');change('Organiser’s name','Audit Organiser');
  if(celebrationType!=='other')change(celebrationType==='school'?'School name':'Company or organisation name','Audit Organisation');
  change('Event name','Organisation Event');await next();await screen.findByText('Step 4 of 10');expect(m.answers.organiserName).toBe('Audit Organiser');expect(m.answers.eventName).toBe('Organisation Event');
 });
 it.each(['cocktail','undecided'] as const)('page 6 tables: %s does not require or create allocated starting tables',async(eventFormat)=>{
  m.answers={eventFormat};mount(7);await screen.findByText('Step 7 of 10');expect(screen.queryByRole('radio',{name:'Automatically create my starting tables'})).not.toBeInTheDocument();await next();await screen.findByText('Step 8 of 10');
 });
 it('review/completion: edit every review row, retry failure, prevent duplicate submits, and lock completed answers',async()=>{
  m.answers=ready();m.answers.eventImagePath='audit-owner/drafts/audit-draft/photo.jpg';mount(9);await screen.findByText('Step 9 of 10');
  for(const [label,step]of [['Event',2],['Photo or logo',3],['People',3],['Date & time',4],['Location',4],['Celebration and locations',5],['Guests',6],['Tables',7],['Budget',8]] as const){
   fireEvent.click(screen.getByRole('button',{name:`Edit ${label}`}));await screen.findByText(`Step ${step} of 10`);fireEvent.click(screen.getByRole('button',{name:'History Back'}));await screen.findByText('Step 9 of 10');
  }
  m.complete.mockRejectedValueOnce(new Error('Creation temporarily unavailable'));
  fireEvent.click(screen.getByRole('button',{name:'Create My Event'}));expect(await screen.findByRole('alert')).toHaveTextContent('Creation temporarily unavailable');expect(m.answers.eventImagePath).toContain('photo.jpg');
  let finish!:(value:string)=>void;m.complete.mockImplementationOnce(()=>new Promise<string>(resolve=>{finish=resolve;}));
  const create=screen.getByRole('button',{name:'Create My Event'});fireEvent.click(create);fireEvent.click(create);await waitFor(()=>expect(m.complete).toHaveBeenCalledTimes(2));
  await (await import('@testing-library/react')).act(async()=>{finish('audit-event');});
  await screen.findByText('Step 10 of 10');expect(screen.queryByRole('button',{name:'Back'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Edit Budget'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Enter Wedding Waitress'}));await screen.findByRole('heading',{name:'My Events workspace'});
 });
 it('page 7 budget: every range/unknown/exact choice, amount edges and review/edit persistence',async()=>{
  m.answers=ready();const v=mount(8);await screen.findByText('Step 8 of 10');expect(screen.getAllByRole('radio')).toHaveLength(9);
  for(const radio of screen.getAllByRole('radio')){fireEvent.click(radio);expect(radio).toHaveAttribute('aria-checked','true');}
  fireEvent.click(screen.getByRole('radio',{name:'Enter an exact amount'}));
  for(const value of ['-1','not money','1.001']){change('Exact amount (AUD)',value);await next();expect(field('Exact amount (AUD)')).toHaveAttribute('aria-invalid','true');}
  change('Exact amount (AUD)','A$25,000.50');await next();await screen.findByText('Step 9 of 10');expect(screen.getByRole('heading',{name:'Budget'}).parentElement).toHaveTextContent('A$25,000.5');
  fireEvent.click(screen.getByRole('button',{name:'Edit Budget'}));await screen.findByText('Step 8 of 10');fireEvent.click(screen.getByRole('radio',{name:'$25,000–$30,000'}));await next();await screen.findByText('Step 9 of 10');expect(screen.getByRole('heading',{name:'Budget'}).parentElement).toHaveTextContent('$25,000–$30,000');
  v.unmount();mount();await screen.findByText('Step 9 of 10');expect(m.answers.budgetChoice).toBe('25000-30000');
 });
 it('page 7 budget: save failure leaves answers visible and retry advances safely',async()=>{
  m.answers=ready();mount(8);await screen.findByText('Step 8 of 10');m.failSave=true;await next();expect(await screen.findByRole('alert')).toHaveTextContent('Audit save unavailable');expect(screen.getByText('Step 8 of 10')).toBeInTheDocument();
  m.failSave=false;await next();await screen.findByText('Step 9 of 10');expect(m.answers.budgetChoice).toBe('25000-30000');
 });
 it('page 6 tables: all shapes, capacity errors, head-table fields, manual counts and create-later',async()=>{
  m.answers={eventFormat:'seated',expectedAttending:'200',tableCreation:'automatic',tableCapacity:'8',headTable:'no',guestTableCount:'1'};mount(7);await screen.findByText('Step 7 of 10');
  for(const name of ['Round','Square','Long','Mixed']){fireEvent.click(screen.getByRole('radio',{name}));expect(screen.getByRole('radio',{name})).toHaveAttribute('aria-checked','true');}
  change('Typical guests per table','21');await next();expect(field('Typical guests per table')).toHaveAttribute('aria-invalid','true');
  fireEvent.click(screen.getByRole('radio',{name:'Long'}));change('Typical guests per table','50');change('Will you have a Head Table?','yes');change('People at the Head Table','125');await next();expect(field('People at the Head Table')).toHaveAttribute('aria-invalid','true');
  change('People at the Head Table','10');change('Number of guest tables to create','1.5');await next();expect(field('Number of guest tables to create')).toHaveAttribute('aria-invalid','true');
  fireEvent.click(screen.getByRole('radio',{name:'I’ll create my tables later'}));expect(screen.queryByLabelText(/^Typical guests per table/)).not.toBeInTheDocument();await next();await screen.findByText('Step 8 of 10');expect(m.answers.tableCreation).toBe('later');
 });
 it('page 6 tables: plan table limit is checked before advancing to budget',async()=>{
  m.plan.table_limit=2;m.answers={eventFormat:'seated',expectedAttending:'40',tableCreation:'automatic',tableStyle:'round',tableCapacity:'8',headTable:'no',guestTableCount:'3'};mount(7);await screen.findByText('Step 7 of 10');await next();expect(await screen.findByRole('alert')).toHaveTextContent('2 starting tables');expect(m.step).not.toBe(8);
  change('Number of guest tables to create','2');await next();await screen.findByText('Step 8 of 10');
 });
 it('page 5 guests: formats, whole-number validation, allowance display, Back and reload',async()=>{
  m.answers={celebrationType:'wedding'};const v=mount(6);await screen.findByText('Step 6 of 10');
  for(const name of ['Stand-up cocktail event without allocated tables','A combination of seated and cocktail','We haven’t decided yet','Sit-down event with tables']){fireEvent.click(screen.getByRole('radio',{name}));expect(screen.getByRole('radio',{name})).toHaveAttribute('aria-checked','true');}
  for(const label of ['Approximate number invited','Expected number attending','Adults, if known','Children, if known','Vendors or event staff requiring seats'])change(label,'-1');
  await next();expect(field('Expected number attending')).toHaveAttribute('aria-invalid','true');change('Expected number attending','4.5');await next();expect(field('Expected number attending')).toHaveAttribute('aria-invalid','true');
  for(const [label,value]of Object.entries({'Approximate number invited':'50','Expected number attending':'40','Adults, if known':'30','Children, if known':'5','Vendors or event staff requiring seats':'5'}))change(label,value);
  expect(screen.getByText('100')).toBeInTheDocument();await next();await screen.findByText('Step 7 of 10');v.unmount();mount(6);await screen.findByDisplayValue('40');expect(field('Children, if known')).toHaveValue(5);expect(m.complete).not.toHaveBeenCalled();
 });
 it('page 5 guests: unsure permits empty estimates but never saves a negative supplied number',async()=>{
  m.answers={eventFormat:'cocktail',guestCountsUnsure:true};mount(6);await screen.findByText('Step 6 of 10');change('Adults, if known','-1');await next();expect(field('Adults, if known')).toHaveAttribute('aria-invalid','true');
  change('Adults, if known','');await next();await screen.findByText('Step 7 of 10');expect(screen.getByText(/No allocated guest tables/)).toBeInTheDocument();
 });
 it('page 4 event parts: wedding choices and same/different/unknown locations',async()=>{
  m.answers={celebrationType:'wedding'};mount(5);await screen.findByText('Step 5 of 10');
  for(const choice of ['Ceremony only','Reception only','We haven’t decided yet']){fireEvent.click(screen.getByRole('radio',{name:choice}));expect(screen.queryByLabelText(/^Ceremony location name/)).not.toBeInTheDocument();}
  fireEvent.click(screen.getByRole('radio',{name:'Ceremony and reception'}));await next();expect(screen.getByRole('radiogroup',{name:'Ceremony and reception locations'})).toHaveAttribute('aria-invalid','true');
  fireEvent.click(screen.getByRole('radio',{name:'No — Different locations'}));await next();for(const label of ['Ceremony location name','Ceremony address','Reception location name','Reception address'])expect(field(label)).toHaveAttribute('aria-invalid','true');
  for(const [label,value]of Object.entries({'Ceremony location name':'First venue','Ceremony address':'First address','Reception location name':'Second venue','Reception address':'Second address'}))change(label,value);
  fireEvent.click(screen.getByRole('radio',{name:'Yes — Same location'}));expect(screen.queryByLabelText(/^Ceremony address/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio',{name:'No — Different locations'}));expect(field('Ceremony address')).toHaveValue('First address');await next();await screen.findByText('Step 6 of 10');
 });
 it('page 4 event parts: non-wedding multiple locations remain selectable after save and reload',async()=>{
  m.answers={celebrationType:'birthday',honoureeName:'Jordan'};const v=mount(5);await screen.findByText('Step 5 of 10');
  fireEvent.click(screen.getByRole('radio',{name:'More than one part or location'}));
  for(const [label,value]of Object.entries({'Main venue or first location':'First venue','Main venue or first address':'First address','Second venue or location':'Second venue','Second address':'Second address'}))change(label,value);
  await next();await screen.findByText('Step 6 of 10');expect(m.answers.partsChoice).toBe('multiple');
  v.unmount();mount(5);expect(await screen.findByRole('radio',{name:'More than one part or location'})).toHaveAttribute('aria-checked','true');expect(field('Main venue or first location')).toHaveValue('First venue');
 });
 it('page 3 date/location: exact date, all venue controls, validation, unsure toggles and reload',async()=>{
  m.answers={celebrationType:'wedding'};const v=mount(4);await screen.findByText('Step 4 of 10');
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Date certainty'})).getByRole('radio',{name:'We have selected an exact date'}));
  fireEvent.click(screen.getByRole('radio',{name:'We have booked a venue'}));await next();expect(field('Event date')).toHaveAttribute('aria-invalid','true');expect(field('Venue name')).toHaveAttribute('aria-invalid','true');
  for(const [label,value]of Object.entries({'Event date':'2027-05-01','Start time':'18:00','Finish time':'01:00','RSVP deadline':'2027-06-01','Venue name':'Audit Hall','Venue address':'1 Example Road','Suburb':'Example','State':'NSW','Postcode':'bad','Country':'Australia','Venue contact person':'Venue Team','Venue telephone or mobile':'bad','Venue contact email':'bad'}))change(label,value);
  await next();expect(field('RSVP deadline')).toHaveAttribute('aria-invalid','true');expect(field('Postcode')).toHaveAttribute('aria-invalid','true');expect(field('Venue contact email')).toHaveAttribute('aria-invalid','true');expect(field('Venue telephone or mobile')).toHaveAttribute('aria-invalid','true');
  change('RSVP deadline','2027-04-01');change('Postcode','2000');change('Venue contact email','venue@example.com');change('Venue telephone or mobile','02 9123 4567');await next();await screen.findByText('Step 5 of 10');
  fireEvent.click(screen.getByRole('button',{name:'Back'}));await screen.findByText('Step 4 of 10');
  fireEvent.click(field('Start and finish times not decided yet'));fireEvent.click(field('RSVP deadline not decided yet'));expect(screen.queryByLabelText(/^Start time/)).not.toBeInTheDocument();
  await next();await screen.findByText('Step 5 of 10');v.unmount();mount(4);await screen.findByDisplayValue('Audit Hall');expect(field('RSVP deadline not decided yet')).toBeChecked();
 });
 it('page 3 date/location: month/year rejects an impossible year and undecided ignores hidden errors',async()=>{
  mount(4);await screen.findByText('Step 4 of 10');fireEvent.click(screen.getByRole('radio',{name:'We know the month and year'}));
  change('Month','5');change('Year','0000');fireEvent.click(within(screen.getByRole('radiogroup',{name:'Venue status'})).getByRole('radio',{name:'We haven’t decided yet'}));
  await next();expect(field('Year')).toHaveAttribute('aria-invalid','true');change('Year','2027');await next();await screen.findByText('Step 5 of 10');
 });
 it('page 2 details: required couple names, editable suggestion, optional surnames and resume',async()=>{
  m.answers={celebrationType:'wedding'};const v=mount(3);await screen.findByText('Step 3 of 10');
  expect(field('Your first name')).toHaveValue('Audit');expect(field('Your surname')).not.toBeRequired();
  await next();expect(field('Your partner’s first name')).toHaveAttribute('aria-invalid','true');
  change('Your partner’s first name','Partner');change('Your partner’s surname','Example');change('Event name','Our custom wedding');
  await waitFor(()=>expect(m.save).toHaveBeenCalledWith(expect.objectContaining({eventName:'Our custom wedding',partnerSurname:'Example'}),3),{timeout:1800});
  v.unmount();mount();await screen.findByDisplayValue('Our custom wedding');expect(field('Your partner’s first name')).toHaveValue('Partner');
  await next();await screen.findByText('Step 4 of 10');
 });
 it('page 2 details: birthday optional age rejects negative and fractional input',async()=>{
  m.answers={celebrationType:'birthday',honoureeName:'Jordan'};mount(3);await screen.findByText('Step 3 of 10');
  change('Age','-1');await next();expect(field('Age')).toHaveAttribute('aria-invalid','true');
  change('Age','1.5');await next();expect(field('Age')).toHaveAttribute('aria-invalid','true');
  change('Age','21');await next();await screen.findByText('Step 4 of 10');expect(m.answers.eventName).toBe('Jordan’s 21st Birthday');
 });
 it('page 1 celebration: all seven choices, Other validation, navigation and reload',async()=>{
  const v=mount(2);await screen.findByText('Step 2 of 10');expect(screen.getAllByRole('radio')).toHaveLength(7);
  await next();expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid','true');
  fireEvent.click(screen.getByRole('radio',{name:'Other Event'}));await next();expect(field('Please tell us what type of event you’re planning')).toHaveAttribute('aria-invalid','true');
  change('Please tell us what type of event you’re planning','Anniversary');await next();await screen.findByText('Step 3 of 10');
  fireEvent.click(screen.getByRole('button',{name:'Back'}));await screen.findByText('Step 2 of 10');expect(screen.getByDisplayValue('Anniversary')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio',{name:'Wedding'}));expect(screen.queryByDisplayValue('Anniversary')).not.toBeInTheDocument();
  await next();await screen.findByText('Step 3 of 10');fireEvent.click(screen.getByRole('button',{name:'History Back'}));await screen.findByText('Step 2 of 10');fireEvent.click(screen.getByRole('button',{name:'History Forward'}));await screen.findByText('Step 3 of 10');
  v.unmount();mount();await screen.findByText('Step 3 of 10');expect(m.answers.celebrationType).toBe('wedding');expect(m.answers.otherEventType).toBe('');
 });
});


it('lets trial guests choose a package while saving their onboarding answers',async()=>{m.plan={plan_name:'Starter',guest_limit:20,table_limit:5,status:'active',is_read_only:false};m.answers=ready();mount(6);await screen.findByText('Step 6 of 10');await next();await screen.findByRole('heading',{name:'Your free trial'});fireEvent.click(screen.getByRole('button',{name:'Upgrade Now'}));await screen.findByText('Package selection');expect(m.answers.expectedAttending).toBe('40');expect(m.complete).not.toHaveBeenCalled();});
it('lets a trial continue within its allowance without discarding a larger guest estimate',async()=>{m.plan={plan_name:'Starter',guest_limit:20,table_limit:5,status:'active',is_read_only:false};m.answers=ready();mount(6);await screen.findByText('Step 6 of 10');await next();await screen.findByRole('heading',{name:'Your free trial'});fireEvent.click(screen.getByRole('button',{name:'Continue my free trial'}));await screen.findByText('Step 7 of 10');expect(m.answers.expectedAttending).toBe('40');expect(m.plan.guest_limit).toBe(20);});
