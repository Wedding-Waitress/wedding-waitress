import React, {createContext,useContext} from 'react';

// Presentation/interaction scope only. Never changes authenticated identity,
// ownership, session claims or server authorization.
const ReadOnlyAccountPreviewContext=createContext(false);
const PreviewCustomerContext=createContext<string|undefined>(undefined);
export const useReadOnlyAccountPreview=()=>useContext(ReadOnlyAccountPreviewContext);
export const useReadOnlyPreviewCustomer=()=>useContext(PreviewCustomerContext);
export function ReadOnlyAccountPreviewProvider({children,customerId}:{children:React.ReactNode;customerId?:string}) {
  return <ReadOnlyAccountPreviewContext.Provider value><PreviewCustomerContext.Provider value={customerId}>{children}</PreviewCustomerContext.Provider></ReadOnlyAccountPreviewContext.Provider>;
}
