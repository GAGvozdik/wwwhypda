// Presentation evidence only. Every protected route still performs its server check.
let verifiedEpoch: number | undefined;
export const rememberAuthenticatedPresentation = (epoch: number) => { verifiedEpoch=epoch; };
export const forgetAuthenticatedPresentation = () => { verifiedEpoch=undefined; };
export const hasAuthenticatedPresentation = (epoch: number) => verifiedEpoch===epoch;