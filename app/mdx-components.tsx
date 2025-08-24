// mdx-components.tsx (repo root)
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // example overrides; tweak as you like
    h1: (props) => <h1 className="text-3xl font-bold mb-4" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-8 mb-3" {...props} />,
    p:  (props) => <p className="leading-relaxed my-3" {...props} />,
    ul: (props) => <ul className="list-disc pl-6 my-3" {...props} />,
    ol: (props) => <ol className="list-decimal pl-6 my-3" {...props} />,
    a:  (props) => <a className="text-indigo-600 underline" {...props} />,
    ...components,
  };
}
export default useMDXComponents;
