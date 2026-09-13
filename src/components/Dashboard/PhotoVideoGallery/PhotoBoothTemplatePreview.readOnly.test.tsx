import {render,screen,act} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({strip:vi.fn()}));
vi.mock('@/lib/photoBoothTemplate',()=>({composeStrip:mocks.strip,composeSingle:mocks.strip,makePlaceholderPhoto:()=>({}),PB_STRIP_COUNT:4}));
import {PhotoBoothTemplatePreview} from './PhotoBoothTemplatePreview';
const opts={title:'Saved wedding',dateText:'5 September 2027',bottomText:null,logoUrl:null,templateUrl:null,showBranding:true,strictAssets:true};
afterEach(()=>{vi.useRealTimers();mocks.strip.mockReset();});
describe('bounded readonly Photo Booth composition',()=>{
 it('stops stalled composition and refuses its late image',async()=>{
  vi.useFakeTimers();let resolve!:(value:unknown)=>void;mocks.strip.mockImplementation(()=>new Promise(value=>{resolve=value;}));
  render(<PhotoBoothTemplatePreview kind="strip" opts={opts} timeoutMs={10000}/>);
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  await act(async()=>resolve({toDataURL:()=> 'data:image/jpeg;base64,late'}));expect(screen.queryByRole('img')).not.toBeInTheDocument();
 });
 it('renders a successful original image without modifying its bytes',async()=>{
  mocks.strip.mockResolvedValue({toDataURL:()=> 'data:image/jpeg;base64,original'});render(<PhotoBoothTemplatePreview kind="strip" opts={opts} timeoutMs={10000}/>);
  expect(await screen.findByRole('img',{name:'Photo strip template preview'})).toHaveAttribute('src','data:image/jpeg;base64,original');
 });
});
