import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LiveStreamingPage } from "./LiveStreamingPage";
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/dev/live-streaming");
});
const addTrial = () => {
  fireEvent.click(screen.getByRole("button", { name: "Preview free test" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Event name"), {
    target: { value: "Private test" },
  });
  fireEvent.change(within(dialog).getByLabelText("Event date"), {
    target: { value: "2026-12-20" },
  });
  fireEvent.click(within(dialog).getByRole("checkbox"));
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Add preview free test" }),
  );
};
describe("Live Streaming local preview interface", () => {
  it("requires event details and affirmative acknowledgement, without checkout", () => {
    render(<LiveStreamingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Preview free test" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Add preview free test" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/No payments, broadcasts or video files are created/),
    ).toBeInTheDocument();
  });
  it("allows one trial, preserves it on refresh, and generates distinct role links", () => {
    const { unmount } = render(<LiveStreamingPage />);
    addTrial();
    expect(
      screen.getByRole("button", { name: "Free test already selected" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Camera link")).not.toHaveValue(
      screen.getByLabelText("Live viewing link").getAttribute("value"),
    );
    expect(screen.getByTestId("stream-time-remaining")).toHaveTextContent(
      "00:10:00",
    );
    unmount();
    render(<LiveStreamingPage />);
    expect(
      screen.getByRole("button", { name: "Free test already selected" }),
    ).toBeDisabled();
  });
  it("updates used time, displays an upgrade prompt at exhaustion and cannot exceed five downloads", () => {
    render(<LiveStreamingPage />);
    addTrial();
    fireEvent.click(screen.getByText("Owner preview controls"));
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate 5 minutes used" }),
    );
    expect(screen.getByTestId("stream-time-remaining")).toHaveTextContent(
      "00:05:00",
    );
    const download = screen.getByRole("button", {
      name: "Simulate completed download",
    });
    for (let i = 0; i < 5; i++) fireEvent.click(download);
    expect(download).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate allowance finished" }),
    );
    expect(
      screen.getByRole("heading", { name: "Your free test has finished" }),
    ).toBeInTheDocument();
  });
  it("does not offer guest replay or download controls", () => {
    const { unmount } = render(<LiveStreamingPage />);
    addTrial();
    const viewer = (
      screen.getByLabelText("Live viewing link") as HTMLInputElement
    ).value;
    unmount();
    window.history.replaceState({}, "", viewer);
    render(<LiveStreamingPage />);
    expect(
      screen.queryByRole("button", { name: /Download/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /No replay, recording purchase or download is available/,
      ),
    ).toBeInTheDocument();
  });
});
