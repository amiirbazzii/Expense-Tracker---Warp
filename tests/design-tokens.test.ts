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
