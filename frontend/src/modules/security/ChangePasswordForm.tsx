import { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import {
  useChangePassword,
  getPasswordError,
} from "@/queries/auth/useChangePassword";

export const ChangePasswordForm = () => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const {
    mutate: changePassword,
    isPending,
    isSuccess,
    error,
  } = useChangePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) return;
    changePassword({
      old_password: formData.old_password,
      new_password: formData.new_password,
    });
    setFormData({ old_password: "", new_password: "", confirm_password: "" });
  };

  const isFormValid =
    formData.old_password &&
    formData.new_password &&
    formData.new_password === formData.confirm_password;
  const showMismatchError =
    formData.confirm_password &&
    formData.new_password !== formData.confirm_password;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginBottom: "var(--space-6)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldAlert size={20} style={{ color: "var(--color-accent)" }} />
          Change Password
        </h3>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          Manage your active sessions across different devices and browsers.
        </p>
      </div>

      <div className="chart-panel" style={{ maxWidth: "100%" }}>
        {/* Alert Header */}
        <div
          className="alert alert-warning"
          style={{ marginBottom: "var(--space-6)" }}
        >
          <ShieldAlert className="alert-icon" size={16} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>
              Security Notice
            </div>
            <div style={{ fontSize: "12px" }}>
              Ensure your new password is secure. After a successful change, you
              may need to re-authenticate on your other devices.
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          {/* Current Password */}
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div className="form-control-wrap">
              <KeyRound className="form-control-icon" size={16} />
              <input
                type={showCurrent ? "text" : "password"}
                value={formData.old_password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    old_password: e.target.value,
                  }))
                }
                placeholder="••••••••"
                disabled={isPending}
                className="form-control has-icon has-right-icon"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="form-toggle-icon"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="form-control-wrap">
              <KeyRound className="form-control-icon" size={16} />
              <input
                type={showNew ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    new_password: e.target.value,
                  }))
                }
                placeholder="Min. 8 characters"
                disabled={isPending}
                className="form-control has-icon has-right-icon"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="form-toggle-icon"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div
            className="form-group"
            style={{ marginBottom: "var(--space-6)" }}
          >
            <label className="form-label">Confirm New Password</label>
            <div className="form-control-wrap">
              <KeyRound className="form-control-icon" size={16} />
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirm_password: e.target.value,
                  }))
                }
                placeholder="Confirm new password"
                disabled={isPending}
                className="form-control has-icon"
                style={{
                  borderColor: showMismatchError
                    ? "var(--color-danger)"
                    : undefined,
                }}
                required
              />
            </div>
            {showMismatchError && (
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--color-danger)",
                  marginTop: "4px",
                }}
              >
                Passwords do not match.
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error">{getPasswordError(error)}</div>
          )}

          {isSuccess && (
            <div className="alert alert-success">
              <CheckCircle2 className="alert-icon" size={16} />
              Password updated successfully
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !isFormValid}
            className="btn"
            style={{ width: "100%", marginTop: "var(--space-2)" }}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {isPending ? "Updating password..." : "Update Password"}
          </button>
        </form>
      </div>
    </>
  );
};
