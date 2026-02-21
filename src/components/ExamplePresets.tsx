import React from 'react';
import { Button } from '@/components/ui/button';

interface Example {
  name: string;
  code: string;
  description: string;
}

const EXAMPLES: Example[] = [
  {
    name: 'Smilies',
    code: '(10×10):"🥶"0-89;🫢55-99;',
    description: 'Smiley composition example',
  },
  {
    name: 'Chemistry: C₁₃H₁₄',
    code: '(30×15):H5-98;"2"67-99;C8-101;—11-104;C14-107;H16-109;"3"78-110;C166-259;H168-261;"3"230-262;"|"[r=115]189-284;"|"[r=65]186-281;"|"[r=0]69-251;"|"[r=115]336-431;"|"[r=65]339-434;"|"[r=65]192-287;"|"[r=115]183-278;"|"[r=65]180-275;"|"[r=115]330-425;"|"[r=65]333-428;"|"[r=0]210-392;"|"[r=0]215-397;"|"[r=0]216-398;"|"[r=0]222-404;"|"[r=65]210-276;"|"[r=115]330-396;"|"[r=115]218-284;"|"[r=65]338-404',
    description: '2-Methyl-1-ethylnaphthalene',
  },
  {
    name: 'Vector F',
    code: '(5):F5-24;→0-9',
    description: 'Letter F with arrow above',
  },
  {
    name: 'Superscript',
    code: '(6):a0-35;"2"3-11',
    description: 'a² — squared',
  },
  {
    name: 'Formula F=ma',
    code: '(10×6):F0-53;"="23-35;m15-47;a17-49;→0-13',
    description: "Newton's second law with vector",
  },
  {
    name: 'Fraction',
    code: '(4×6):a0-11;─8-15;b12-23',
    description: 'a/b — simple fraction',
  },
  {
    name: 'Integral',
    code: '(9):∫0-77;a12-12;b66-66;x40-40;"dx"31-53',
    description: 'Definite integral',
  },
  {
    name: 'Chemistry: H₂O',
    code: '(10×6):H0-55;"2"44-55;O4-59',
    description: 'Water molecule',
  },
  {
    name: 'Rectangular',
    code: '(10×3):F6-29;→0-29',
    description: '10 columns × 3 rows grid',
  },
  {
    name: 'Complex',
    code: '(10×9):∑0-86;"n=0"72-84;∞1-15;"f(n)"34-59',
    description: 'Summation series',
  },
  {
    name: 'Multi-layer',
    code: '(8):█8-63;A[c="#000"]16-47',
    description: 'Symbol on background',
  },
  {
    name: 'Colored Vector',
    code: '(5):F[c=red]5-24;→[c=blue]0-9',
    description: 'Red F, blue arrow',
  },
  {
    name: 'Rotations →',
    code: '(4×6):→[r=0]8-13;→[r=90]0-5;→[r=180]16-21;→[r=270]10-15',
    description: '4 directions from one arrow',
  },
  {
    name: 'Reflection',
    code: '(5):F0-22;F[f=h;c=cyan]2-24',
    description: 'F and mirrored F',
  },
  {
    name: 'Transparency',
    code: '(10):●[c=red;a=0.5]10-99;★[c=yellow;a=0.5]11-88',
    description: 'Layers with transparency',
  },
  {
    name: 'Multi-line Demo',
    code: `# Example multi-line format
(5):F5-24;→0-9
(6):a0-35;"2"3-11

// Chemistry formula
(10×6):H0-55;"2"44-55;O4-59`,
    description: 'Multi-line with comments',
  },
];

interface ExamplePresetsProps {
  onSelect: (code: string) => void;
  currentCode: string;
}

export const ExamplePresets: React.FC<ExamplePresetsProps> = ({
  onSelect,
  currentCode,
}) => {
  return (
    <div className="space-y-3">
      <div className="panel-header">Examples</div>

      <div className="grid grid-cols-2 gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example.name}
            variant={currentCode === example.code ? 'default' : 'secondary'}
            size="sm"
            className="h-auto py-2 px-3 flex flex-col items-start gap-0.5 text-left"
            onClick={() => onSelect(example.code)}
          >
            <span className="font-medium text-sm">{example.name}</span>
            <span className="text-[10px] opacity-70 font-normal">{example.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
