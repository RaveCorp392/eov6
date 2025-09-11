// components/ConsentGate.tsx
'use client';

import { useEffect, useState } from 'react';
import ConsentModal from './ConsentModal';

export default function ConsentGate(props: {
  code: string;
  policy?: any;
  consentAccepted?: boolean;
  role: 'caller' | 'agent';
  children: React.ReactNode;
}) {
  const [needConsent, setNeedConsent] = useState(
    Boolean(props?.policy?.required) && !props?.consentAccepted
  );
  useEffect(() => {
    setNeedConsent(Boolean(props?.policy?.required) && !props?.consentAccepted);
  }, [props.policy, props.consentAccepted]);

  return (
    <>
      {needConsent && (
        <ConsentModal
          code={props.code}
          policy={props.policy}
          consentAccepted={props.consentAccepted}
          role={props.role}
        />
      )}
      {/* If you want to block the UI until accepted, you can conditionally render children. */}
      <div className={needConsent ? 'pointer-events-none opacity-50' : ''}>{props.children}</div>
    </>
  );
}
