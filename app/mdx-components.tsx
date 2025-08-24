import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="mt-8 text-xl font-semibold" {...props} />,
    h3: (props) => <h3 className="mt-6 text-lg font-semibold" {...props} />,
    p:  (props) => <p className="mt-3 text-slate-700" {...props} />,
    ul: (props) => <ul className="mt-3 list-disc pl-6 text-slate-700" {...props} />,
    ol: (props) => <ol className="mt-3 list-decimal pl-6 text-slate-700" {...props} />,
    li: (props) => <li className="mt-1" {...props} />,
    a:  (props) => <a className="underline decoration-indigo-400 underline-offset-4 hover:text-indigo-700" {...props} />,
    code: (props) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.95em]" {...props} />,
    ...components,
  };
}
