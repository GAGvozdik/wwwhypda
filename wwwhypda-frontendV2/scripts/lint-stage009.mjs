import {spawnSync} from 'node:child_process';
const files=['commonFeatures/authSkeleton.tsx','commonFeatures/authLoadingContext.ts','users/auth/forgotPassword.tsx','commonFeatures/maintenanceState.ts','commonFeatures/maintenanceNotice.tsx','modal/modalWindow.tsx','api.tsx','mainWindow/mainWindow.tsx','users/useAuthCheck.tsx','users/routes/protectedRoute.tsx','users/routes/superProtectedRoute.tsx','users/auth/login.tsx','users/auth/registration.tsx','users/auth/registrationConfirmation.tsx','commonFeatures/recaptchaRoutes.ts','pages/userAgreement.tsx','pages/privacyPolicy.tsx','pages/cookiePolicy.tsx'];
// Existing production HOC, not a rule suppression or runtime behavior change.
const result=spawnSync('node',['node_modules/eslint/bin/eslint.js',...files.map(f=>'src/components/'+f),'--rule',JSON.stringify({'react-refresh/only-export-components':['error',{allowConstantExport:true,extraHOCs:['withRecaptcha']}]})],{stdio:'inherit'});
process.exit(result.status??1);
