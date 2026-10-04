import fs from 'fs';
import path from 'path';

const MIGRATED_FILES = [
  'src/components/Button.tsx',
  'src/components/Chip.tsx',
  'src/components/Input.tsx',
  'src/components/InputContainer.tsx',
  'src/components/Tabs.tsx',
  'src/components/BottomSheet.tsx',
  'src/components/AppHeader.tsx',
  'src/components/BottomNav.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/FullScreenLoader.tsx',
  'src/components/HeaderRow.tsx',
  'src/components/CurrencyInput.tsx',
  'src/components/DropdownMenu.tsx',
  'src/components/InstallPrompt.tsx',
  'src/components/LazyComponents.tsx',
  'src/components/LanguageWrapper.tsx',
  'src/components/PwaRegistration.tsx',
  'src/components/ProtectedRoute.tsx',
  'src/components/TextComponents.tsx',
  'src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx',
  'src/features/dashboard/components/Charts/DailySpendingChart.tsx',
];

const EXPECTED_TOKENS = [
  '--surface-page',
  '--surface-app',
  '--surface-raised',
  '--surface-field',
  '--surface-sunken',
  '--surface-hover',
  '--surface-active',
  '--surface-overlay',
  '--border-subtle',
  '--border-default',
  '--border-strong',
  '--ink-primary',
  '--ink-secondary',
  '--ink-tertiary',
  '--ink-disabled',
  '--ink-inverse',
  '--ink-link',
  '--ink-link-hover',
  '--accent',
  '--accent-foreground',
  '--accent-hover',
  '--accent-active',
  '--danger-surface',
  '--danger-border',
  '--danger-active',
  '--danger-active-border',
  '--danger-text',
  '--sync-synced',
  '--sync-syncing',
  '--sync-offline',
  '--sync-attention',
  '--radius-field',
  '--shadow-neumo',
  '--shadow-neumo-hover',
  '--shadow-neumo-active',
  '--shadow-raised',
  '--shadow-focus-field',
];

const FORBIDDEN_PATTERNS = [
  { name: 'raw hex color', regex: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgba/rgb functional color', regex: /rgba?\(/ },
  { name: 'arbitrary Tailwind hex class', regex: /-\[#/ },
  {
    name: 'stock palette utility',
    regex: /(text|bg|border|ring|from|to)-(gray|slate|neutral|red|green|blue|amber|orange|yellow)-\d/,
  },
];

describe('Design Tokens Refactor (Step 2)', () => {
  describe('No forbidden color patterns in migrated components', () => {
    MIGRATED_FILES.forEach((relPath) => {
      it(`verifies ${relPath} contains no raw hex, rgba, or stock palette utilities`, () => {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
            const matches = line.match(regex);
            if (matches) {
              throw new Error(
                `Forbidden ${name} found in ${relPath}:${idx + 1} -> "${line.trim()}" (matched: ${matches[0]})`
              );
            }
          });
        });
      });
    });
  });

  describe('Tokens CSS completeness', () => {
    it('defines all required design tokens in src/styles/tokens.css', () => {
      const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
      expect(fs.existsSync(tokensPath)).toBe(true);

      const tokensContent = fs.readFileSync(tokensPath, 'utf8');

      EXPECTED_TOKENS.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });
  });
});
