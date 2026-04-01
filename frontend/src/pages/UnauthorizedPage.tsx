import { ArrowLeft, Home, Lock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const UnauthorizedPage = () => {
  const navigate = useNavigate();

  const whyPoints = [
    "This page is restricted to users with specific role assignments.",
    "Your current account does not hold the required access level.",
    "This is an intentional security restriction, not a technical error.",
  ];

  const whatPoints = [
    "Contact your system administrator or L&D team to request access.",
    "Provide your employee ID and the page URL you were trying to reach.",
    "If you believe this is a mistake, ask your manager to review your role.",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(160deg, #0F1623 0%, #1C2A3A 100%)",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.9);  opacity: 0.6; }
          70%  { transform: scale(1.12); opacity: 0.1; }
          100% { transform: scale(1.12); opacity: 0;   }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .unauth-page { animation: fadeInUp 400ms ease both; }

        .unauth-btn-primary {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; width: 100%; height: 44px;
          border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 14px; font-weight: 600;
          cursor: pointer; border: none;
          background: var(--color-accent); color: #fff;
          transition: background-color 150ms ease, transform 100ms ease;
          letter-spacing: 0.01em;
        }
        .unauth-btn-primary:hover {
          background: var(--color-accent-hover);
          transform: translateY(-1px);
        }
        .unauth-btn-secondary {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; width: 100%; height: 44px;
          border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 14px; font-weight: 500;
          cursor: pointer;
          background: rgba(255,255,255,0.05);
          color: #8FA3B8;
          border: 1px solid rgba(255,255,255,0.1);
          transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
          letter-spacing: 0.01em;
        }
        .unauth-btn-secondary:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.18);
          color: #fff;
        }
        .report-link {
          color: var(--color-accent); cursor: pointer; font-weight: 500;
          transition: color 150ms ease;
        }
        .report-link:hover { color: var(--color-accent-hover); }
      `}</style>

      {/* ── Background decorations ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.025) 39px, rgba(255,255,255,0.025) 40px),
          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.025) 39px, rgba(255,255,255,0.025) 40px)
        `,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-120px",
          left: "-80px",
          width: "520px",
          height: "520px",
          background:
            "radial-gradient(circle, rgba(192,57,43,0.18) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          right: "-60px",
          width: "380px",
          height: "380px",
          background:
            "radial-gradient(circle, rgba(232,131,58,0.09) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(100px, 18vw, 320px)",
          fontWeight: 700,
          color: "rgba(255,255,255,0.03)",
          lineHeight: 1,
          letterSpacing: "-8px",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        403
      </div>

      {/* ── Topbar ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "18px 48px",
        }}
      >
        {/* ── Branding top-left ── */}
        <div
          style={{
            position: "absolute",
            top: "28px",
            left: "40px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "auto",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/assets/images/ultimatix-logo.jpg"
              alt="ultimatix logo"
              style={{
                width: "50px",
                borderRadius: "inherit",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "15px",
              color: "rgba(255, 255, 255, 1)",
            }}
          >
            Ultimatix LMS
          </span>
        </div>
      </div>

      {/* ── Body: flex-1, centers content vertically ── */}
      <div
        className="unauth-page"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center" /* vertical center in remaining space */,
          justifyContent: "center",
          padding: "48px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/*
          Grid layout:
            col 1 → left hero (fixed 420px)
            col 2 → 1px divider line
            col 3 → right info + actions (takes rest)
          alignItems: center ensures both columns share the same vertical midpoint.
        */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1px 1fr",
            columnGap: "64px",
            alignItems:
              "center" /* ← key: vertically centers both cols to each other */,
            width: "100%",
            maxWidth: "1040px",
          }}
        >
          {/* ── LEFT col ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center" /* horizontally center within left col */,
              textAlign: "center",
            }}
          >
            {/* Lock icon + pulse rings */}
            <div
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-22px",
                  borderRadius: "50%",
                  border: "1px solid rgba(192,57,43,0.2)",
                  animation: "pulse-ring 2.8s ease-out infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "-11px",
                  borderRadius: "50%",
                  border: "1px solid rgba(192,57,43,0.36)",
                  animation: "pulse-ring 2.8s ease-out 0.55s infinite",
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(145deg, rgba(192,57,43,0.3), rgba(192,57,43,0.1))",
                  border: "1px solid rgba(192,57,43,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#E05A47",
                }}
              >
                <Lock size={32} strokeWidth={1.5} />
              </div>
            </div>

            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(192,57,43,0.16)",
                border: "1px solid rgba(192,57,43,0.32)",
                color: "#E87B6A",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 13px",
                borderRadius: "var(--radius-full)",
                marginBottom: "20px",
              }}
            >
              <AlertTriangle size={10} strokeWidth={2.5} />
              Access Forbidden
            </div>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "40px",
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.18,
                marginBottom: "16px",
              }}
            >
              You're not
              <br />
              authorised here
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "#8FA3B8",
                lineHeight: 1.75,
                maxWidth: "300px",
                margin: 0,
              }}
            >
              Your account doesn't have the roles or permissions required to
              view this section of Ultimatix LMS.
            </p>
          </div>

          {/* ── Divider col ── */}
          <div
            style={{
              width: "1px",
              alignSelf: "stretch" /* stretches full height of the row */,
              background: "rgba(255,255,255,0.08)",
            }}
          />

          {/* ── RIGHT col ── */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Why section */}
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
                margin: "0 0 12px",
              }}
            >
              Why am I seeing this?
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 28px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {whyPoints.map((point, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      marginTop: "7px",
                      flexShrink: 0,
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#8FA3B8",
                      lineHeight: 1.65,
                    }}
                  >
                    {point}
                  </span>
                </li>
              ))}
            </ul>

            {/* Section divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.07)",
                marginBottom: "28px",
              }}
            />

            {/* What to do section */}
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
                margin: "0 0 12px",
              }}
            >
              What can you do?
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {whatPoints.map((point, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      marginTop: "7px",
                      flexShrink: 0,
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#8FA3B8",
                      lineHeight: 1.65,
                    }}
                  >
                    {point}
                  </span>
                </li>
              ))}
            </ul>

            {/* Buttons */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <button
                className="unauth-btn-primary"
                onClick={() => navigate("/dashboard", { replace: true })}
              >
                <Home size={15} strokeWidth={2} />
                Return to Dashboard
              </button>
              <button
                className="unauth-btn-secondary"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Go Back
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
