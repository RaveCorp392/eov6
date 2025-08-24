// mdx-components.tsx
import React from 'react';

export function useMDXComponents(components: Record<string, any> = {}) {
  return {
    h2: (props: any) => <h2 className="text-xl font-semibold mt-8 mb-3" {...props} />,
    p:  (props: any) => <p className="leading-7 text-gray-700 mb-4" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-6 mb-4" {...props} />,
    li: (props: any) => <li className="mb-1" {...props} />,
    a:  (props: any) => <a className="text-indigo-600 underline" {...props} />,
    ...components,
  };
}
