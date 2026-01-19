
export interface Collateral {
  name: string;
  value: number;
  isAppreciating: boolean;
}

export interface Purpose {
  label: string;
  isNeed: boolean;
  finePrint: string;
}

export interface ApplicationForm {
  id: string;
  applicantName: string;
  creditScore: number;
  requestedAmount: number;
  collateral: Collateral;
  purpose: Purpose;
  monthlyIncome: number;
  history?: {
    latePayments: number;
    accountAgeYears: number;
    bankruptcies: number;
  };
}

export enum Decision {
  APPROVE = 'APPROVE',
  DENY = 'DENY'
}

export enum Appraisal {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY'
}

export enum GameStage {
  START = 'START',
  TUTORIAL = 'TUTORIAL',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Policy {
  id: string;
  title: string;
  description: string;
  rule: (form: ApplicationForm) => { shouldApprove?: boolean; shouldDeny?: boolean };
}

export interface GameState {
  foundation: number;
  score: number;
  formsProcessed: number;
  stage: GameStage;
  streak: number;
  currentPolicy: Policy | null;
  appraisalMade: Appraisal | null;
}
