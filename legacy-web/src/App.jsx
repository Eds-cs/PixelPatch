import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { ROUTES } from "./constants/routes";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import AppLayout from "./components/shared/AppLayout";

/* ---------- MAIN PAGES ---------- */
import Home from "./components/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Services from "./components/Services";
import ServiceDetails from "./components/ServiceDetails";
import BecomePartner from "./components/BecomePartner";
import ShopProfile from "./components/ShopProfile";
import UserProfile from "./components/UserProfile";
import AccountSignUp from "./components/AccountSignUp";
import ChatPage from "./components/chat/ChatPage.jsx";

/* ---------- BUSINESS SIGNUP ---------- */
import BusinessSignUpPg1 from "./components/business/BusinessSignUpPg1";
import BusinessSignUpPg2 from "./components/business/BusinessSignUpPg2";
import BusinessSignUpPg3 from "./components/business/BusinessSignUpPg3";
import BusinessSignUpPg4 from "./components/business/BusinessSignUpPg4";

/* ---------- CLIENT FEATURES ---------- */
import ClientBooking from "./components/Client-Booking";
import ClientRepairRequestModalPage from "./components/ClientRepairRequestModalPage";
import EmailVerifyPage from "./components/EmailVerifyPage";
import RegistrationPopUp from "./components/RegistrationPopUp";
import ReviewModalOnly from "./components/ReviewModalOnly";

/* ---------- CLIENT REPAIRS ---------- */
import Repairs from "./components/Repairs/Repairs";
import ClientRepairDetails from "./components/Repairs/ClientRepairDetails";
import RepairPending from "./components/Repairs/RepairsPending";
import RepairAccepted from "./components/Repairs/RepairsAccepted";
import RepairInProgress from "./components/Repairs/RepairsInProgress";
import RepairDone from "./components/Repairs/RepairsDone";
import ClientRepairCompleted from "./components/Repairs/RepairsCompleted";
import ClientPaymentDetailsModal from "./components/Repairs/PaymentDetailsModal";

/* ---------- SHOP ---------- */
import ShopCreateVoucher from "./components/Shop/CreateVoucher";
import ShopDetails from "./components/Shop/Details";
import ShopDetailsEditable from "./components/Shop/DetailsEditable";
import ShopDiscounts from "./components/Shop/Discounts";
import ShopReview from "./components/Shop/Review";
import ShopService from "./components/Shop/Service";

/* ---------- OTHER USER FEATURES ---------- */
import Settings from "./components/Settings";
import Help from "./components/Help";
import About from "./components/About";
import Devices from "./components/Devices";
import { SocketProvider } from "./context/SocketContext";

/* ---------- BUSINESS ---------- */
import BusinessLayout from "./components/business/components/BusinessLayout";
import BusinessDashboard from "./components/business/pages/BusinessDashboard";
import BusinessSettings from "./components/business/BusinessSettings";
import BusinessHelp from "./components/business/BusinessHelp";
import BusinessServices from "./components/business/BusinessServices";
import BusinessDiscounts from "./components/business/BusinessDiscounts";
import BusinessReviews from "./components/business/BusinessReviews";
import BusinessProfile from "./components/business/BusinessProfile";
import BusinessDisputes from "./components/business/pages/BusinessDisputes";
import BusinessDisputeDetails from "./components/business/pages/BusinessDisputeDetails";



import ClientMessages from "./components/Messages";

import PaymentSuccess from "./components/Repairs/PaymentSuccess";
import PaymentFailed from "./components/Repairs/PaymentFailed";



/* ---------- Business Repairs Routes ---------- */
import { businessRoutes } from "./components/business/routes";

const {
  Repairs: BusinessRepairs,
  RepairDetails,
  RepairPending: BusinessRepairPending,
  RepairAwaitingAssessment,
  RepairAssessmentNoQuotation,
  RepairInProgress: BusinessRepairInProgress,
  RepairDone: BusinessRepairDone,
  RepairRejected,
  RepairCompleted,
} = businessRoutes;

function App() {
  return (
    <Router>
      <SocketProvider>
      <ErrorBoundary>
        <Routes>

          {/* ---------- PUBLIC (NO LAYOUT) ---------- */}
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.SIGNUP} element={<SignUp />} />

          {/* ======================================================
                ALL USER PAGES — Wrapped with AppLayout
             ====================================================== */}
          <Route element={<AppLayout />}>

            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path="/ai" element={<Home />} />

            {/* AI & Chat */}
            <Route path={ROUTES.MESSAGES} element={<ClientMessages />} />
            <Route path={ROUTES.CHAT_LIST} element={<ChatPage />} />

            {/* General */}
            <Route path={ROUTES.SERVICES} element={<Services />} />
            <Route path={ROUTES.PARTNER} element={<BecomePartner />} />

            {/* Signup Flow */}
            <Route path={ROUTES.ACCOUNT_SIGNUP} element={<AccountSignUp />} />
            <Route path={ROUTES.BUSINESS_SIGNUP.STEP1} element={<BusinessSignUpPg1 />} />
            <Route path={ROUTES.BUSINESS_SIGNUP.STEP2} element={<BusinessSignUpPg2 />} />
            <Route path={ROUTES.BUSINESS_SIGNUP.STEP3} element={<BusinessSignUpPg3 />} />
            <Route path={ROUTES.BUSINESS_SIGNUP.STEP4} element={<BusinessSignUpPg4 />} />

            {/* Client Features */}
            <Route path={ROUTES.CLIENT_BOOKING} element={<ClientBooking />} />
            <Route path={ROUTES.CLIENT_REPAIR_REQUEST_MODAL} element={<ClientRepairRequestModalPage />} />
            <Route path={ROUTES.CLIENT_PAYMENT_DETAILS_MODAL} element={<ClientPaymentDetailsModal />} />
            <Route path={ROUTES.EMAIL_VERIFY} element={<EmailVerifyPage />} />
            <Route path={ROUTES.REGISTRATION_POPUP} element={<RegistrationPopUp />} />
            <Route path={ROUTES.REVIEW_MODAL} element={<ReviewModalOnly />} />
            <Route path="/services/:serviceKey" element={<ServiceDetails />} />

            {/* Repairs */}
            <Route path={ROUTES.REPAIRS} element={<Repairs />} />
            <Route path={ROUTES.CLIENT_REPAIR_DETAIL} element={<ClientRepairDetails />} />
            <Route path={ROUTES.REPAIR_PENDING} element={<RepairPending />} />
            <Route path={ROUTES.REPAIRS_ACCEPTED} element={<RepairAccepted />} />
            <Route path={ROUTES.REPAIRS_IN_PROGRESS} element={<RepairInProgress />} />
            <Route path={ROUTES.REPAIRS_REJECTED} element={<RepairRejected />} />
            <Route path={ROUTES.REPAIRS_DONE} element={<RepairDone />} />
            <Route path={ROUTES.REPAIRS_COMPLETED} element={<ClientRepairCompleted />} />

            {/* Shop */}
            <Route path={ROUTES.SHOP_DETAIL_PATH} element={<ShopProfile />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.CREATE_VOUCHER} element={<ShopCreateVoucher />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.DETAILS} element={<ShopDetails />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.DETAILS_EDITABLE} element={<ShopDetailsEditable />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.DISCOUNTS} element={<ShopDiscounts />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.REVIEW} element={<ShopReview />} />
            <Route path={ROUTES.SHOP_MANAGEMENT.SERVICE} element={<ShopService />} />

            {/* User Account */}
            <Route path={ROUTES.PROFILE} element={<UserProfile />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.HELP} element={<Help />} />
            <Route path={ROUTES.ABOUT} element={<About />} />
            <Route path={ROUTES.DEVICES} element={<Devices />} />

            {/* Payment status */}
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />


            {/* ======================================================
                    BUSINESS PORTAL — Wrapped inside BusinessLayout
               ====================================================== */}
            <Route
              path={ROUTES.BUSINESS.DASHBOARD}
              element={
                <BusinessLayout active="dashboard">
                  <BusinessDashboard />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.PROFILE}
              element={
                <BusinessLayout active="profile">
                  <BusinessProfile />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIRS}
              element={
                <BusinessLayout active="repairs">
                  <BusinessRepairs />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_DETAIL}
              element={
                <BusinessLayout active="repairs">
                  <RepairDetails />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_PENDING}
              element={
                <BusinessLayout active="repairs">
                  <BusinessRepairPending />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.AWAITING_ASSESSMENT}
              element={
                <BusinessLayout active="repairs">
                  <RepairAwaitingAssessment />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_ASSESSMENT}
              element={
                <BusinessLayout active="repairs">
                  <RepairAssessmentNoQuotation />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_IN_PROGRESS}
              element={
                <BusinessLayout active="repairs">
                  <BusinessRepairInProgress />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_DONE}
              element={
                <BusinessLayout active="repairs">
                  <BusinessRepairDone />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REPAIR_COMPLETED}
              element={
                <BusinessLayout active="repairs">
                  <RepairCompleted />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.SERVICES}
              element={
                <BusinessLayout active="services">
                  <BusinessServices />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.DISCOUNTS}
              element={
                <BusinessLayout active="discounts">
                  <BusinessDiscounts />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.REVIEWS}
              element={
                <BusinessLayout active="reviews">
                  <BusinessReviews />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.SETTINGS}
              element={
                <BusinessLayout active="settings">
                  <BusinessSettings />
                </BusinessLayout>
              }
            />
            <Route
              path={ROUTES.BUSINESS.DISPUTES}
              element={
                <BusinessLayout active="disputes">
                  <BusinessDisputes />
                </BusinessLayout>
              }
            />

            <Route
              path="/business/disputes/:id"
              element={
                <BusinessLayout active="disputes">
                  <BusinessDisputeDetails />
                </BusinessLayout>
              }
            />

            <Route
              path={ROUTES.BUSINESS.HELP}
              element={
                <BusinessLayout active="help">
                  <BusinessHelp />
                </BusinessLayout>
              }
            />

          </Route>

          {/* Not Found */}
          <Route
            path="*"
            element={<div className="p-8 text-center">Page Not Found</div>}
          />

        </Routes>
      </ErrorBoundary>
      </SocketProvider>
    </Router>
  );
}

export default App;
