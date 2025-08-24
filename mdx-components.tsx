// mdx-components.tsx
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="text-3xl font-semibold tracking-tight mb-4" {...props} />
    ),
    h2: (props) => (
      <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-3" {...props} />
    ),
    h3: (props) => (
      <h3 className="text-xl font-semibold tracking-tight mt-6 mb-2" {...props} />
    ),
    p: (props) => <p className="leading-7 mb-4 text-gray-800" {...props} />,
    ul: (props) => <ul className="list-disc pl-6 space-y-1 mb-4" {...props} />,
    ol: (props) => <ol className="list-decimal pl-6 space-y-1 mb-4" {...props} />,
    li: (props) => <li className="ml-1" {...props} />,
    a: (props) => (
      <a className="text-indigo-600 underline underline-offset-2" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4"
        {...props}
      />
    ),
    code: (props) => (
      <code className="rounded bg-gray-100 px-1 py-0.5 text-sm" {...props} />
    ),
    pre: (props) => (
      <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto my-4" {...props} />
    ),
    ...components,
  };
}
