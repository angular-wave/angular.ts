import type {
  Policy,
  PolicyContext,
  PolicyDecision,
} from "@angular-wave/angular.ts";

type AuditContext = PolicyContext<"audit">;

const decision: PolicyDecision<"allow"> = {
  type: "allow",
};
const policy: Policy<AuditContext, "allow"> = (context) => ({
  ...decision,
  meta: context.meta,
});

void policy;
