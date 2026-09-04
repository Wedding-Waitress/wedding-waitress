import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MANROPE_14_MEDIUM_MARKER,
  isManrope14Regular,
  normalizeAppOwnedTypography,
  startAppOwnedTypographyNormalization,
} from "./appOwnedTypography";

const renderText = (style: string, text = "Rendered text") => {
  const element = document.createElement("p");
  element.setAttribute("style", style);
  element.textContent = text;
  document.getElementById("root")?.append(element);
  return element;
};

describe("app-owned typography normalization", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    const style = document.createElement("style");
    style.textContent = `[${MANROPE_14_MEDIUM_MARKER}] { font-weight: 500 !important; }`;
    document.head.append(style);
  });

  afterEach(() => {
    document.head.querySelectorAll("style").forEach((style) => style.remove());
  });

  it("changes only normal Manrope text at exactly 14px and 400", () => {
    const eligible = renderText(
      "font-family: Manrope, sans-serif; font-style: normal; font-size: 14px; font-weight: 400; line-height: 24px; color: rgb(65, 36, 25); letter-spacing: 0px;",
    );
    const alreadyMedium = renderText(
      "font-family: Manrope; font-style: normal; font-size: 14px; font-weight: 500;",
    );
    const semibold = renderText(
      "font-family: Manrope; font-style: normal; font-size: 14px; font-weight: 600;",
    );
    const italic = renderText(
      "font-family: Manrope; font-style: italic; font-size: 14px; font-weight: 400;",
    );
    const smaller = renderText(
      "font-family: Manrope; font-style: normal; font-size: 13px; font-weight: 400;",
    );
    const larger = renderText(
      "font-family: Manrope; font-style: normal; font-size: 16px; font-weight: 400;",
    );
    const otherFamily = renderText(
      "font-family: Arial; font-style: normal; font-size: 14px; font-weight: 400;",
    );

    expect(normalizeAppOwnedTypography()).toBe(1);
    expect(window.getComputedStyle(eligible).fontWeight).toBe("500");
    expect(eligible).toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(alreadyMedium).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(semibold).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(italic).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(smaller).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(larger).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(otherFamily).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
  });

  it("preserves every computed property except the qualifying weight", () => {
    const eligible = renderText(
      "font-family: Manrope; font-style: normal; font-size: 0.875rem; font-weight: 400; line-height: 24px; color: rgb(65, 36, 25); letter-spacing: 0px; text-decoration: underline; transition: color 200ms ease;",
    );
    const before = window.getComputedStyle(eligible);
    const preserved = {
      fontFamily: before.fontFamily,
      fontStyle: before.fontStyle,
      fontSize: before.fontSize,
      lineHeight: before.lineHeight,
      color: before.color,
      letterSpacing: before.letterSpacing,
      textDecoration: before.textDecoration,
      transition: before.transition,
    };

    normalizeAppOwnedTypography();
    const after = window.getComputedStyle(eligible);

    expect(after.fontWeight).toBe("500");
    Object.entries(preserved).forEach(([property, value]) => {
      expect(after[property as keyof CSSStyleDeclaration]).toBe(value);
    });
  });

  it("normalizes app portals while leaving unrelated document content alone", () => {
    const portal = document.createElement("div");
    portal.setAttribute("role", "dialog");
    portal.setAttribute("data-state", "open");
    portal.innerHTML =
      '<p style="font-family: Manrope; font-style: normal; font-size: 14px; font-weight: 400">Dialog copy</p>';
    document.body.append(portal);

    const external = document.createElement("p");
    external.setAttribute(
      "style",
      "font-family: Manrope; font-style: normal; font-size: 14px; font-weight: 400",
    );
    external.textContent = "Third-party copy";
    document.body.append(external);

    normalizeAppOwnedTypography();

    expect(portal.querySelector("p")).toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(external).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
  });

  it("records nested qualifying text from the unmodified computed state", () => {
    const parent = renderText(
      "font-family: Manrope; font-style: normal; font-size: 14px; font-weight: 400;",
      "Parent copy",
    );
    const child = document.createElement("span");
    child.textContent = "Child copy";
    parent.append(child);

    expect(normalizeAppOwnedTypography()).toBe(2);
    expect(parent).toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    expect(child).toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
  });

  it("recognises only the exact authoritative computed tuple", () => {
    expect(
      isManrope14Regular({
        fontFamily: '"Manrope", sans-serif',
        fontStyle: "normal",
        fontSize: "14px",
        fontWeight: "400",
      } as CSSStyleDeclaration),
    ).toBe(true);
    expect(
      isManrope14Regular({
        fontFamily: '"Manrope", sans-serif',
        fontStyle: "normal",
        fontSize: "14px",
        fontWeight: "normal",
      } as CSSStyleDeclaration),
    ).toBe(false);
  });

  it("re-evaluates text added or restyled during client-side navigation", async () => {
    const stop = startAppOwnedTypographyNormalization();
    const text = renderText(
      "font-family: Manrope; font-style: normal; font-size: 16px; font-weight: 400;",
    );
    const nextFrame = () =>
      new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    await nextFrame();
    expect(text).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);

    text.style.fontSize = "14px";
    await nextFrame();
    expect(text).toHaveAttribute(MANROPE_14_MEDIUM_MARKER);

    text.style.fontStyle = "italic";
    await nextFrame();
    expect(text).not.toHaveAttribute(MANROPE_14_MEDIUM_MARKER);
    stop();
  });
});
