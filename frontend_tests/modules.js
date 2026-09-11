// Shared module wiring for the vm-based harnesses.
//
// In the browser app.js pulls frontend/*.js in through dynamic import and hands them to
// wireUiModules(). The harnesses run app.js inside a vm that has no module loader, so they have to
// attach the modules themselves. Keeping that here means a newly extracted module gets registered
// once, instead of in every harness — which is exactly what broke when charts and metrics moved out.
import * as dashboard from "../frontend/dashboard.js";
import * as operations from "../frontend/operations.js";
import * as tools from "../frontend/tools.js";
import * as reports from "../frontend/reports.js";
import * as taxes from "../frontend/taxes.js";
import * as charts from "../frontend/charts.js";
import * as metrics from "../frontend/metrics.js";

export function wireModules(hooks) {
  hooks.wireUiModules({ dashboard, operations, tools, reports, taxes, charts, metrics });
}
