import React from 'react';
import {render,cleanup} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import {createInstance} from 'i18next';
import {afterEach,describe,it,expect} from 'vitest';
import {PublicCopy} from './PublicCopy';
import {publicPhotoGroupSources,publicPhotoGroupRows} from './publicPhotoGroupCopy';
afterEach(cleanup);
describe('Group Photo List public translations',()=>{
 it.each(Object.keys(publicPhotoGroupRows))('renders every new feature string in %s',async language=>{const instance=createInstance();await instance.init({lng:language,resources:{},initImmediate:false});const {container}=render(<I18nextProvider i18n={instance}>{publicPhotoGroupSources.map((text,index)=><span data-copy={index} key={text}><PublicCopy text={text}/></span>)}</I18nextProvider>);const spans=container.querySelectorAll('[data-copy]');expect(spans).toHaveLength(publicPhotoGroupSources.length);spans.forEach((span,index)=>expect(span.textContent).toBe(publicPhotoGroupRows[language][index]));});
});
