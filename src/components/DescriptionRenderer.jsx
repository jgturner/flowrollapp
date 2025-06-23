import Linkify from 'react-linkify';

const DescriptionRenderer = ({ text }) => {
  // componentDecorator is a function that Linkify will use to render the links
  const componentDecorator = (href, text, key) => (
    <a href={href} key={key} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500">
      {text}
    </a>
  );

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      <Linkify componentDecorator={componentDecorator}>{text || ''}</Linkify>
    </div>
  );
};

export default DescriptionRenderer;
