import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const api=vi.hoisted(()=>({invoke:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:api.invoke}}}));
vi.mock('sonner',()=>({toast:{success:api.success,error:api.error}}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>({'contact.fullName':'Full Name','contact.email':'Email','contact.eventType':'Type of Event','contact.message':'Message','contact.sendButton':'Send Message'}[key]||key)})}));
import {ContactForm} from './ContactForm';
beforeEach(()=>{vi.clearAllMocks();api.invoke.mockResolvedValue({data:{success:true,accepted:true},error:null});});afterEach(cleanup);
const fill=()=>{fireEvent.change(screen.getByLabelText('Full Name'),{target:{value:'Routing test'}});fireEvent.change(screen.getByLabelText('Email'),{target:{value:'support@weddingwaitress.com.au'}});fireEvent.change(screen.getByLabelText('Type of Event'),{target:{value:'Wedding'}});fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Test enquiry'}});};
describe('shared public and account forms',()=>{
 it('submits the public Contact form for the info inbox',async()=>{
  render(<ContactForm/>);fill();fireEvent.click(screen.getByRole('button',{name:'Send Message'}));await waitFor(()=>expect(api.invoke).toHaveBeenCalledWith('send-transactional-email',{body:expect.objectContaining({recipientEmail:'info@weddingwaitress.com.au',supportContext:{source:'public_contact',category:'Wedding'}})}));
 });
 it('prefills the account form and submits it with account-support identity',async()=>{
  render(<ContactForm supportSource="account_support" initialName="Account Owner" initialEmail="owner@example.test"/>);expect(screen.getByLabelText('Full Name')).toHaveValue('Account Owner');expect(screen.getByLabelText('Email')).toHaveValue('owner@example.test');fireEvent.change(screen.getByLabelText('Type of Event'),{target:{value:'Wedding'}});fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Please help'}});fireEvent.click(screen.getByRole('button',{name:'Send Message'}));await waitFor(()=>expect(api.invoke).toHaveBeenCalledWith('send-transactional-email',{body:expect.objectContaining({recipientEmail:'support@weddingwaitress.com.au',supportContext:{source:'account_support',category:'Wedding'},templateData:expect.objectContaining({email:'owner@example.test',name:'Account Owner'})})}));
 });
 it('retains the message if sending fails',async()=>{
  api.invoke.mockResolvedValue({data:null,error:{message:'Unavailable'}});render(<ContactForm supportSource="account_support"/>);fill();fireEvent.click(screen.getByRole('button',{name:'Send Message'}));await waitFor(()=>expect(api.error).toHaveBeenCalled());expect(screen.getByLabelText('Message')).toHaveValue('Test enquiry');expect(api.success).not.toHaveBeenCalled();
 });
});
