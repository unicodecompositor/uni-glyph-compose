import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const FormatReference: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span>Format Reference</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">Basic Syntax</h4>
            <code className="block bg-secondary/50 p-2 rounded text-xs font-mono">
              (N):symbol[params]start-end;...
            </code>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Grid Size</h4>
            <ul className="space-y-1.5 text-muted-foreground text-xs">
              <li><span className="text-primary font-mono">(5)</span> — square 5×5</li>
              <li><span className="text-primary font-mono">(10×3)</span> — rectangular 10 cols × 3 rows</li>
              <li><span className="text-primary font-mono">(8x4)</span> — x character also works</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Escaping</h4>
            <ul className="space-y-1.5 text-muted-foreground text-xs">
              <li><span className="text-primary font-mono">"2"</span> — quotes for digits/strings</li>
              <li><span className="text-primary font-mono">'text'</span> — single quotes</li>
              <li><span className="text-primary font-mono">\;</span> — backslash for special chars</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Symbol Parameters</h4>
            <code className="block bg-secondary/50 p-2 rounded text-xs font-mono mb-2">
              symbol[c=red;r=45;a=0.8;f=h]
            </code>
            <ul className="space-y-1.5 text-muted-foreground text-xs">
              <li><span className="text-primary font-mono">c=</span> — color (red, #FF0000)</li>
              <li><span className="text-primary font-mono">r=</span> — rotation (degrees, 0-360)</li>
              <li><span className="text-primary font-mono">a=</span> — opacity (0.0-1.0)</li>
              <li><span className="text-primary font-mono">f=</span> — flip (h, v, hv)</li>
              <li><span className="text-primary font-mono">font=</span> — font family</li>
              <li><span className="text-primary font-mono">s=</span> — scale (s=2 or s=2,1.5 for x,y)</li>
              <li><span className="text-primary font-mono">t=</span> — transition time (seconds)</li>
              <li><span className="text-primary font-mono">m=</span> — margin (1t 0r 0b 0l or CSS-like)</li>
              <li><span className="text-primary font-mono">p=</span> — position (1t 0r 0b 0l)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Index Formula</h4>
            <code className="block bg-secondary/50 p-2 rounded text-xs font-mono">
              index = Y × W + X
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              where X, Y — coordinates, W — grid width
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Comments (in multi-line)</h4>
            <ul className="space-y-1.5 text-muted-foreground text-xs">
              <li><span className="text-primary font-mono"># comment</span></li>
              <li><span className="text-primary font-mono">// comment</span></li>
              <li><span className="text-primary font-mono">-- comment</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Layers</h4>
            <p className="text-xs text-muted-foreground">
              First symbol → bottom layer<br/>
              Last symbol → top layer
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
