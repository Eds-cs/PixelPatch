import Repair from './Repair';
import RepairDetails from './RepairDetails';
import RepairRejected from './RepairRejected';
import RepairPending from './RepairPending';
import RepairAwaitingAssessment from './RepairAwaitingAssessment';
import RepairAssessmentNoQuotation from './RepairAssessmentNoQuotation';
import RepairInProgress from './RepairInProgress';
import RepairDone from './RepairDone';
import RepairCompleted from './RepairCompleted';

// Business section route components
export const businessRoutes = {
  Repairs: Repair,
  RepairDetails: RepairDetails,
  RepairAwaitingAssessment: RepairAwaitingAssessment,
  RepairAssessmentNoQuotation: RepairAssessmentNoQuotation,
  RepairInProgress: RepairInProgress,
  RepairDone: RepairDone,
  RepairRejected: RepairRejected,
  RepairPending: RepairPending,
  RepairCompleted: RepairCompleted,
};