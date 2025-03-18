import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  description?: string;
  icon?: string;
}

const CustomNode = ({ data }: NodeProps<CustomNodeData>) => {
  return (
    <div className="custom-node">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="custom-handle"
      />
      <div className="custom-node-header">
        {data.icon && (
          <span className="custom-node-icon">
            {data.icon}
          </span>
        )}
        {data.label}
      </div>
      {data.description && (
        <div className="custom-node-description">
          {data.description}
        </div>
      )}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="custom-handle"
      />
    </div>
  );
};

export default memo(CustomNode); 