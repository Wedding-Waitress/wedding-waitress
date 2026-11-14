import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {PlanUpgradeStatus} from './PlanUpgradeStatus';
const state=vi.hoisted(()=>({plan:{plan_name:'Starter',status:'active',is_read_only:false,expires_at:'2099-11-08T00:00:00Z'},loading:false,hasPlatformOwnerAccess:false}));
vi.mock('@/hooks/useUserPlan',()=>({useUserPlan:()=>state}));
vi.mock('./UpgradePlanModal',()=>({UpgradePlanModal:({onOpenChange}:any)=><div role="dialog" aria-label="Upgrade your plan"><button onClick={()=>onOpenChange(false)}>Cancel packages</button></div>}));
beforeEach(()=>{state.plan={plan_name:'Starter',status:'active',is_read_only:false,expires_at:'2099-11-08T00:00:00Z'};state.loading=false;state.hasPlatformOwnerAccess=false;});
it.each([375,1440])('opens the existing package chooser during trial at viewport %s',async(width)=>{Object.defineProperty(window,'innerWidth',{configurable:true,value:width});render(<PlanUpgradeStatus/>);fireEvent.click(screen.getByRole('button',{name:'Upgrade Now'}));expect(await screen.findByRole('dialog',{name:'Upgrade your plan'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Cancel packages'}));expect(screen.getByRole('button',{name:'Upgrade Now'})).toBeInTheDocument();});
it('keeps trial status on cancelled checkout and replaces it on confirmed paid entitlement',async()=>{const view=render(<PlanUpgradeStatus/>);fireEvent.click(screen.getByRole('button',{name:'Upgrade Now'}));await screen.findByRole('dialog');view.rerender(<PlanUpgradeStatus/>);expect(screen.getByRole('button',{name:'Upgrade Now'})).toBeInTheDocument();state.plan={...state.plan,plan_name:'Premium'};view.rerender(<PlanUpgradeStatus/>);expect(screen.getByRole('status')).toHaveTextContent('You are on the Premium plan');expect(screen.getByRole('button',{name:'Upgrade Now'})).toBeInTheDocument();});
it('hides during customer loading and expiry',()=>{state.loading=true;const view=render(<PlanUpgradeStatus/>);expect(screen.queryByRole('button')).not.toBeInTheDocument();state.loading=false;state.plan.expires_at='2020-01-01T00:00:00Z';view.rerender(<PlanUpgradeStatus/>);expect(screen.queryByRole('button')).not.toBeInTheDocument();});

it.each([['Essential',100,true,'Essential'],['Premium',200,true,'Premium'],['Unlimited',400,false,'Ultimate'],['Ultimate',400,false,'Ultimate'],['Ultimate Plan',400,false,'Ultimate']] as const)('shows confirmed %s entitlement and only valid higher tier actions',(plan_name,guest_limit,upgrade,displayName)=>{
 state.plan={...state.plan,plan_name,...{guest_limit}};
 render(<PlanUpgradeStatus/>);
 expect(screen.getByRole('status')).toHaveTextContent('You are on the ' + displayName + ' plan');
 expect(screen.getByText('Up to ' + guest_limit + ' guests')).toBeInTheDocument();
 expect(!!screen.queryByRole('button',{name:'Upgrade Now'})).toBe(upgrade);
 expect(!!screen.queryByText(/Planning for more than .* guests.*only pay the difference/)).toBe(upgrade);
});

it.each(['Essential','Premium'])('offers Ultimate by its public name in %s upgrade guidance',(plan_name)=>{state.plan={...state.plan,plan_name};render(<PlanUpgradeStatus/>);expect(screen.getByText(/only pay the difference/)).toHaveTextContent('Ultimate');expect(screen.queryByText(/Unlimited/)).not.toBeInTheDocument();});

it('shows the same yellow entry for owner access without pretending an old Starter record is a current trial',async()=>{state.hasPlatformOwnerAccess=true;state.plan={...state.plan,expires_at:'2020-01-01T00:00:00Z'};render(<PlanUpgradeStatus/>);expect(screen.getByRole('status')).toHaveTextContent('Platform Owner Access');expect(screen.getByText('All features included · no guest limit')).toBeInTheDocument();expect(screen.queryByText(/trial start|20 guests|Free Trial/i)).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Upgrade Now'}));expect(await screen.findByRole('dialog')).toBeInTheDocument();});
