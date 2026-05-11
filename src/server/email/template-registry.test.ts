import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sendMailMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/services/mailer", () => ({
  sendMail: (...args: unknown[]) => sendMailMock(...args),
}));

const renderMock = vi.fn();
vi.mock("@react-email/components", () => ({
  render: (...args: unknown[]) => renderMock(...args),
}));

import { registerTemplate, dispatchEmail, registry } from "./template-registry";

beforeEach(() => {
  registry.clear();
  sendMailMock.mockClear();
  renderMock.mockClear();
  renderMock.mockResolvedValue("rendered-html");
});

describe("EmailTemplateRegistry", () => {
  it("registers and dispatches a template", async () => {
    const component = vi.fn().mockReturnValue({} as React.ReactElement);
    registerTemplate({
      name: "test_template",
      subject: "Test Subject",
      component: component,
    });

    await dispatchEmail("test_template", "user@test.com", { name: "Alice" });

    expect(component).toHaveBeenCalledWith({ name: "Alice" });
    expect(renderMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock).toHaveBeenCalledWith({
      to: "user@test.com",
      subject: "Test Subject",
      html: "rendered-html",
      text: "rendered-html",
    });
  });

  it("throws on unknown template", async () => {
    await expect(
      dispatchEmail("unknown", "user@test.com", {}),
    ).rejects.toThrow("Unknown email template: unknown");
  });

  it("supports multiple templates", async () => {
    const compA = vi.fn().mockReturnValue({} as React.ReactElement);
    const compB = vi.fn().mockReturnValue({} as React.ReactElement);
    registerTemplate({
      name: "template_a",
      subject: "A",
      component: compA,
    });
    registerTemplate({
      name: "template_b",
      subject: "B",
      component: compB,
    });

    await dispatchEmail("template_a", "a@test.com", { x: 1 });
    await dispatchEmail("template_b", "b@test.com", { y: 2 });

    expect(compA).toHaveBeenCalledWith({ x: 1 });
    expect(compB).toHaveBeenCalledWith({ y: 2 });
  });
});
