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
  'src/components/DateFilterHeader.tsx',
  'src/app/dashboard/page.tsx',
  'src/features/dashboard/components/TotalBalanceCard/TotalBalanceCard.tsx',
  'src/features/dashboard/components/ModeTabs.tsx',
  'src/features/dashboard/components/CardFilter.tsx',
  'src/features/dashboard/components/CategoryList/CategoryList.tsx',
  'src/features/dashboard/components/DashboardFilterSheet.tsx',
  'src/features/dashboard/components/Expenses/ExpenseCard.tsx',
  'src/features/dashboard/components/Expenses/ExpenseList.tsx',
  'src/features/dashboard/components/Expenses/ExpenseActionMenu.tsx',
  'src/features/dashboard/components/AnalyticsTabs/AnalyticsTabs.tsx',
  'src/features/dashboard/components/SummaryCards/SummaryCards.tsx',
  'src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx',
  'src/features/dashboard/components/Charts/DailySpendingChart.tsx',
  'src/features/loans/components/DashboardLoanSection.tsx',
  'src/components/cards/ExpenseCard.tsx',
  'src/components/cards/IncomeCard.tsx',
  'src/components/SmartSelectInput.tsx',
  'src/components/add/CardSelect.tsx',
  'src/components/date-pickers/datePickerComponents.tsx',
  'src/components/date-pickers/GregorianDatePicker.tsx',
  'src/components/date-pickers/PersianDatePicker.tsx',
  'src/components/date-pickers/useDatePickerState.ts',
  'src/app/add/page.tsx',
  'src/components/categories/CategoryManagementSheet.tsx',
  'src/app/cards/page.tsx',
  'src/components/cards/AddCardForm.tsx',
  'src/components/cards/TransferForm.tsx',
  'src/components/cards/CardList.tsx',
  'src/components/cards/ArchivedCardsSection.tsx',
  'src/app/expenses/page.tsx',
  'src/app/expenses/edit/page.tsx',
  'src/components/expenses/ExpenseFormFields.tsx',
  'src/app/income/page.tsx',
  'src/app/income/edit/page.tsx',
  'src/components/income/IncomeFormFields.tsx',
  'src/app/loans/page.tsx',
  'src/features/loans/components/LoanCard.tsx',
  'src/features/loans/components/LoanSummaryCards.tsx',
  'src/features/loans/components/LoanForm.tsx',
  'src/features/loans/components/LoanDetailsSheet.tsx',
  'src/features/loans/components/PayInstallmentSheet.tsx',
  'src/app/settings/page.tsx',
  'src/components/settings/SettingsCard.tsx',
  'src/components/settings/UserProfileSection.tsx',
  'src/components/settings/PreferenceSelect.tsx',
  'src/components/settings/ExportButton.tsx',
  'src/components/settings/BackupBanner.tsx',
  'src/components/RecoveryCodeCard.tsx',
  'src/app/login/page.tsx',
  'src/app/register/page.tsx',
  'src/app/forgot-password/page.tsx',
  'src/app/reset-password/page.tsx',
  'src/app/onboarding/page.tsx',
  'src/app/offline/page.tsx',
  'src/app/not-found.tsx',
  'src/app/global-error.tsx',
  'src/app/critical.css',
  'src/components/EditExpenseSheet.tsx',
  'src/components/EditIncomeSheet.tsx',
  'src/app/test-pwa/page.tsx',
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
  '--ink-success',
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
    regex: /(text|bg|border|ring|from|to)-(gray|slate|neutral|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
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

describe('Ink Success Token (Scoped Light-Theme Green Text Contrast Fix)', () => {
  const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');

  function extractToken(tokenName, context) {
    const escaped = tokenName.replace('--', '\\-\\-');
    const regex = new RegExp(`${escaped}\\s*:\\s*([^;]+)`);
    const match = context.match(regex);
    return match ? match[1].trim() : null;
  }

  function luminance(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const srgb = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function contrastRatio(fg, bg) {
    const L1 = luminance(fg);
    const L2 = luminance(bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }

  it('defines --ink-success in :root (light default) as #008f66', () => {
    const rootBlock = tokensContent.split('@media')[0];
    const value = extractToken('--ink-success', rootBlock);
    expect(value).toBe('#008f66');
  });

  it('defines --ink-success in [data-theme="light"] explicitly as #008f66', () => {
    const lightBlock = tokensContent.split('[data-theme="light"]')[1].split('}')[0];
    const value = extractToken('--ink-success', lightBlock);
    expect(value).toBe('#008f66');
  });

  it('defines --ink-success in [data-theme="dark"] explicitly as #10B981', () => {
    const darkBlock = tokensContent.split('[data-theme="dark"]')[1].split('}')[0];
    const value = extractToken('--ink-success', darkBlock);
    expect(value).toBe('#10B981');
  });

  it('meets WCAG AA 4.5:1 on light default surface-raised (#FFFFFF)', () => {
    const ratio = contrastRatio('#008f66', '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA 4.5:1 on light surface-hover (#E8E8E8) — TotalBalanceCard button default', () => {
    const ratio = contrastRatio('#008f66', '#E8E8E8');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA 4.5:1 on light surface-active (#DCDCDC) — TotalBalanceCard button active', () => {
    const ratio = contrastRatio('#008f66', '#DCDCDC');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA 4.5:1 on light surface-sunken (#F4F4F4) — CardList row hover', () => {
    const ratio = contrastRatio('#008f66', '#F4F4F4');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves --sync-synced unchanged at #10B981 for icons/status/bg', () => {
    const rootBlock = tokensContent.split('@media')[0];
    const value = extractToken('--sync-synced', rootBlock);
    expect(value).toBe('#10B981');
  });

  it('maps --color-ink-success in @theme inline', () => {
    const themeBlock = tokensContent.split('@theme inline')[1];
    expect(themeBlock).toContain('--color-ink-success: var(--ink-success)');
  });
});
