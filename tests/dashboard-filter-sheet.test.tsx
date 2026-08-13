import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Only rendered for the "custom" preset, which these tests do not exercise.
// Stubbing it keeps the suite off the CustomDatePicker -> SettingsContext ->
// AuthContext -> localforage import chain, none of which this sheet's own
// behavior depends on.
jest.mock("@/components/CustomDatePicker", () => ({
  CustomDatePicker: () => null,
}));

import {
  DashboardFilterSheet,
  type DashboardFilters,
} from "@/features/dashboard/components/DashboardFilterSheet";

const initial: DashboardFilters = {
  datePreset: "thisMonth",
  categories: [],
  forValue: undefined,
};

const setup = (overrides: Partial<React.ComponentProps<typeof DashboardFilterSheet>> = {}) => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  render(
    <DashboardFilterSheet
      open
      onClose={onClose}
      categoriesSuggestions={["Food", "Transport"]}
      forSuggestions={["Personal", "Work"]}
      initial={initial}
      onApply={onApply}
      {...overrides}
    />,
  );
  return { onApply, onClose };
};

describe("DashboardFilterSheet", () => {
  it("labels both selects so they are reachable by name", () => {
    setup();

    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("For")).toBeInTheDocument();
  });

  it("hides the For filter when showFor is false", () => {
    setup({ showFor: false });

    expect(screen.queryByLabelText("For")).not.toBeInTheDocument();
  });

  it("applies the selected category and closes", async () => {
    const user = userEvent.setup();
    const { onApply, onClose } = setup();

    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ["Food"], datePreset: "thisMonth" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("applies the selected for value", async () => {
    const user = userEvent.setup();
    const { onApply } = setup();

    await user.selectOptions(screen.getByLabelText("For"), "Work");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ forValue: "Work" }),
    );
  });

  it("reset clears the selections without applying or closing", async () => {
    const user = userEvent.setup();
    const { onApply, onClose } = setup();

    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.click(screen.getByRole("button", { name: /reset/i }));

    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("marks the active time period as pressed", async () => {
    const user = userEvent.setup();
    setup();

    const lastMonth = screen.getByRole("button", { name: "Last month" });
    expect(lastMonth).toHaveAttribute("aria-pressed", "false");

    await user.click(lastMonth);

    expect(lastMonth).toHaveAttribute("aria-pressed", "true");
  });
});
