
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplicationForm, Decision, GameState, Appraisal, GameStage } from './types';
import { NAMES, COLLATERALS, PURPOSES, POLICIES } from './constants';

const App: React.FC = () => {
  const [form, setForm] = useState<ApplicationForm | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    foundation: 100,
    score: 0,
    formsProcessed: 0,
    stage: GameStage.START,
    streak: 0,
    currentPolicy: null,
    appraisalMade: null
  });
  const [isStamping, setIsStamping] = useState<Decision | null>(null);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const [isHandbookOpen, setIsHandbookOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const generateForm = useCallback((): ApplicationForm => {
    const collateral = COLLATERALS[Math.floor(Math.random() * COLLATERALS.length)];
    const purpose = PURPOSES[Math.floor(Math.random() * PURPOSES.length)];
    const score = Math.floor(Math.random() * (850 - 300 + 1)) + 300;
    const monthlyIncome = Math.floor(Math.random() * 8000) + 1200;
    
    const amountMult = Math.random();
    let requestedAmount: number;
    if (amountMult > 0.9) requestedAmount = Math.pow(10, Math.floor(Math.random() * 5) + 6);
    else if (amountMult > 0.5) requestedAmount = Math.floor(Math.random() * 50000);
    else requestedAmount = Math.floor(Math.random() * 500);

    return {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      applicantName: NAMES[Math.floor(Math.random() * NAMES.length)].toUpperCase(),
      creditScore: score,
      requestedAmount,
      collateral,
      purpose,
      monthlyIncome,
      history: {
        latePayments: Math.floor(Math.random() * 10),
        accountAgeYears: Math.floor(Math.random() * 20),
        bankruptcies: Math.random() > 0.95 ? 1 : 0
      }
    };
  }, []);

  const startNewGame = useCallback(() => {
    setGameState({
      foundation: 100,
      score: 0,
      formsProcessed: 0,
      stage: GameStage.PLAYING,
      streak: 0,
      currentPolicy: null,
      appraisalMade: null
    });
    setForm(generateForm());
    setIsStamping(null);
    setFeedback(null);
  }, [generateForm]);

  const handleAppraisal = (type: Appraisal) => {
    setGameState(prev => ({ ...prev, appraisalMade: type }));
  };

  const handleDecision = useCallback((decision: Decision) => {
    if (!form || gameState.stage !== GameStage.PLAYING || isStamping || !gameState.appraisalMade) return;

    setIsStamping(decision);

    // Logic calculation
    const dti = (form.requestedAmount / 12) / form.monthlyIncome;
    const isOverleveraged = dti > 3.0;
    const isCorrectAppraisal = 
      (gameState.appraisalMade === Appraisal.ASSET && form.collateral.isAppreciating) ||
      (gameState.appraisalMade === Appraisal.LIABILITY && !form.collateral.isAppreciating);

    let shouldApprove = (form.creditScore > 650 || (form.purpose.isNeed && form.creditScore > 550)) && !isOverleveraged;
    let shouldDeny = (form.creditScore < 450) || (isOverleveraged && !form.purpose.isNeed) || (form.history?.bankruptcies ?? 0 > 0);

    // Policy Override
    if (gameState.currentPolicy) {
      const policyImpact = gameState.currentPolicy.rule(form);
      if (policyImpact.shouldApprove !== undefined) shouldApprove = policyImpact.shouldApprove;
      if (policyImpact.shouldDeny !== undefined) shouldDeny = policyImpact.shouldDeny;
    }

    let correct = false;
    let failReason = "";

    if (!isCorrectAppraisal) {
      failReason = form.collateral.isAppreciating 
        ? "That was an ASSET! It grows in value over time." 
        : "That was a LIABILITY! It loses value as soon as you buy it.";
    } else if (decision === Decision.APPROVE) {
      if (shouldDeny) {
        if (isOverleveraged) failReason = "Applicant is over-leveraged! Their debt is too high for their income.";
        else if (form.creditScore < 450) failReason = "Poor credit history indicates a high risk of default.";
        else failReason = "High-risk application. Review the history and purpose carefully.";
      } else {
        correct = true;
      }
    } else { // Deny
      if (shouldApprove) {
        if (form.purpose.isNeed) failReason = "This was PRODUCTIVE debt (a Need). It builds long-term foundation!";
        else failReason = "This was a safe, sustainable loan. We should have granted it.";
      } else {
        correct = true;
      }
    }

    setTimeout(() => {
      setGameState(prev => {
        const foundationPenalty = correct ? 4 : -25;
        const newFoundation = Math.min(100, Math.max(0, prev.foundation + foundationPenalty));
        const nextProcessedCount = prev.formsProcessed + 1;
        let nextPolicy = prev.currentPolicy;
        if (nextProcessedCount % 5 === 0) {
          nextPolicy = POLICIES[Math.floor(Math.random() * POLICIES.length)];
        }

        return {
          ...prev,
          foundation: newFoundation,
          score: prev.score + (correct ? 500 + (prev.streak * 100) : 0),
          formsProcessed: nextProcessedCount,
          streak: correct ? prev.streak + 1 : 0,
          stage: newFoundation <= 0 ? GameStage.GAMEOVER : GameStage.PLAYING,
          currentPolicy: nextPolicy,
          appraisalMade: null
        };
      });

      if (!correct) {
        setIsBuzzerActive(true);
        setFeedback(failReason);
        setTimeout(() => setIsBuzzerActive(false), 600);
        // Wait longer on failure to let them read the feedback
        setTimeout(() => {
          setIsStamping(null);
          setFeedback(null);
          setForm(generateForm());
        }, 3500);
      } else {
        setFeedback("SUSTAINABLE CHOICE");
        setTimeout(() => {
          setIsStamping(null);
          setFeedback(null);
          setForm(generateForm());
        }, 800);
      }
    }, 250);
  }, [form, gameState.stage, isStamping, generateForm, gameState.currentPolicy, gameState.appraisalMade]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.stage === GameStage.PLAYING && !feedback) {
        if (e.key.toLowerCase() === 'a') handleDecision(Decision.APPROVE);
        if (e.key.toLowerCase() === 'd') handleDecision(Decision.DENY);
        if (e.key.toLowerCase() === '1') handleAppraisal(Appraisal.ASSET);
        if (e.key.toLowerCase() === '2') handleAppraisal(Appraisal.LIABILITY);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDecision, gameState.stage, feedback]);

  const lightBrightness = Math.max(0.3, (gameState.foundation / 100) * 1.2);
  const deskStyle = {
    filter: gameState.stage === GameStage.START ? 'none' : `brightness(${lightBrightness}) contrast(1.1) saturate(0.7)`,
    transition: 'filter 0.1s ease-out',
  };

  if (gameState.stage === GameStage.START) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-[#e3d5b8] flex-col p-10 typewriter overflow-hidden relative">
        <div className="pixel-overlay opacity-30"></div>
        <div className="grain-overlay"></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 text-center max-w-2xl">
          <p className="text-red-700 font-bold tracking-[0.5em] mb-4 uppercase">Presented by YFLC</p>
          <h1 className="text-9xl mb-12 font-black italic pixel-text tracking-tighter shadow-xl">MARGIN</h1>
          <div className="h-1 bg-gradient-to-r from-transparent via-red-900 to-transparent mb-12"></div>
          <p className="text-lg mb-12 opacity-60 uppercase font-bold leading-relaxed tracking-tight">Most people learn about money when it's already too late. <br/>You are the final barrier. Protect the foundation.</p>
          <div className="flex gap-6 justify-center">
            <button onClick={() => setGameState(prev => ({...prev, stage: GameStage.TUTORIAL}))} className="px-12 py-5 bg-[#e3d5b8] text-black font-black hover:bg-white border-4 border-black pixel-text shadow-[8px_8px_0_#450a0a] active:translate-y-2 active:shadow-none transition-all uppercase text-xl">Start Briefing</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState.stage === GameStage.TUTORIAL) {
    const tutorials = [
      { title: "The Foundation", desc: "Every loan you process affects the 'Financial Foundation'. Bad habits collapse the system. Good decisions strengthen it." },
      { title: "Assets vs Liabilities", desc: "Before deciding, you must appraise. Is the collateral an Asset (grows in value) or a Liability (loses value)? Use [1] or [2]." },
      { title: "Investigation", desc: "Don't trust the surface. Hover over the 'Purpose' section to find hidden red flags and predatory clauses. Use your 'Investigation Lens'." },
      { title: "Productive Debt", desc: "Not all debt is bad. Borrowing for a 'Need' (Education, Survival) is Productive. Borrowing for a 'Want' is High Risk." }
    ];

    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-[#e3d5b8] flex-col p-10 typewriter overflow-hidden relative">
        <div className="pixel-overlay opacity-30"></div>
        <div className="grain-overlay"></div>
        <motion.div key={tutorialStep} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="z-10 bg-[#1a1a1a] p-16 border-4 border-black shadow-[20px_20px_0_#000] max-w-xl text-center">
           <p className="text-red-700 font-bold mb-2 uppercase text-xs">Briefing {tutorialStep + 1} of 4</p>
           <h2 className="text-4xl font-black mb-6 pixel-text uppercase">{tutorials[tutorialStep].title}</h2>
           <p className="text-lg opacity-80 mb-10 leading-relaxed font-bold uppercase">{tutorials[tutorialStep].desc}</p>
           {tutorialStep < tutorials.length - 1 ? (
             <button onClick={() => setTutorialStep(tutorialStep + 1)} className="px-12 py-4 bg-red-900 font-bold border-4 border-black hover:bg-red-800 transition-all uppercase">Next Module</button>
           ) : (
             <button onClick={startNewGame} className="px-12 py-4 bg-green-900 font-bold border-4 border-black hover:bg-green-800 transition-all uppercase">Accept Responsibility</button>
           )}
        </motion.div>
      </div>
    );
  }

  if (gameState.stage === GameStage.GAMEOVER) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-[#e3d5b8] flex-col p-10 typewriter overflow-hidden relative">
        <div className="pixel-overlay"></div>
        <div className="grain-overlay"></div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="z-10 flex flex-col items-center">
          <h1 className="text-7xl mb-8 font-black text-red-700 underline pixel-text z-10 text-center uppercase tracking-tighter">Foundation Collapsed</h1>
          <p className="text-xl mb-6 text-center max-w-lg opacity-80 uppercase z-10 font-bold">Financial literacy standards were ignored. The desk has been cleared. Glory to YFLC.</p>
          <div className="bg-[#111] p-10 border-4 border-red-900 mb-10 shadow-[0_0_30px_rgba(153,27,27,0.5)] z-10">
            <p className="text-3xl mb-2 font-black">LITERACY REVIEWS: {gameState.formsProcessed}</p>
            <p className="text-xl opacity-60 uppercase">FINAL CREDIT RANK: {gameState.score}</p>
          </div>
          <button onClick={startNewGame} className="px-16 py-6 bg-red-900 text-[#e3d5b8] font-bold hover:bg-red-800 border-4 border-black pixel-text shadow-[0_10px_0_#000] z-10 active:translate-y-2 active:shadow-none transition-all uppercase text-2xl">Restore Foundation</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative h-screen w-screen desk-texture overflow-hidden flex flex-col items-center justify-center ${isBuzzerActive ? 'animate-pulse' : ''}`} style={deskStyle}>
      <div className="pixel-overlay"></div>
      <div className="grain-overlay"></div>
      <div className="scanline"></div>
      <div className="desk-lamp"></div>
      
      {/* HUD - TOP LEFT: Foundation */}
      <div className="absolute top-0 left-0 p-8 z-[100] pointer-events-none">
        <div className="bg-[#1a1a1a] p-5 border-4 border-black text-[#e3d5b8] shadow-[8px_8px_0_#000]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black tracking-widest uppercase opacity-70">Financial Foundation</span>
            <span className={`text-xs font-black ${gameState.foundation < 30 ? 'text-red-500 animate-pulse' : ''}`}>{gameState.foundation}%</span>
          </div>
          <div className="w-64 h-6 bg-black p-1 border border-[#e3d5b8]/10 shadow-inner">
            <motion.div className={`h-full ${gameState.foundation > 60 ? 'bg-blue-600' : gameState.foundation > 30 ? 'bg-amber-600' : 'bg-red-600'}`} animate={{ width: `${gameState.foundation}%` }} transition={{ type: 'spring', damping: 20 }} />
          </div>
        </div>
      </div>

      {/* HUD - TOP RIGHT: Score */}
      <div className="absolute top-0 right-0 p-8 z-[100] pointer-events-none">
        <div className="bg-[#1a1a1a] p-5 border-4 border-black text-[#e3d5b8] text-right shadow-[-8px_8px_0_#000]">
          <div className="text-[11px] font-black opacity-40 uppercase tracking-widest mb-1">Expertise Rep</div>
          <p className="text-3xl font-black pixel-text tracking-tighter">{gameState.score.toLocaleString()}</p>
        </div>
      </div>

      {/* MINISTRY POLICY MEMO */}
      <AnimatePresence>
        {gameState.currentPolicy && (
          <motion.div 
            initial={{ x: -300, rotate: -15 }}
            animate={{ x: 0, rotate: -5 }}
            className="absolute top-48 left-8 w-56 bg-white p-6 shadow-2xl border-2 border-gray-300 z-50 text-black overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-red-800"></div>
            <div className="text-[8px] font-black text-red-800 mb-2 uppercase tracking-tighter">YFLC Directive</div>
            <h4 className="text-[11px] font-black uppercase mb-1 leading-tight">{gameState.currentPolicy.title}</h4>
            <p className="text-[10px] leading-tight opacity-70 font-bold uppercase">{gameState.currentPolicy.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN FORM */}
      <motion.div className="flex flex-col items-center justify-center w-full h-full perspective-1000" animate={isBuzzerActive ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}>
        <AnimatePresence mode='wait'>
          {form && (
            <motion.div key={form.id} initial={{ y: -900, rotate: -5, opacity: 0, scale: 0.95 }} animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }} exit={{ x: 1300, y: 200, rotate: 25, opacity: 0 }} transition={{ type: 'spring', damping: 18, stiffness: 90 }} className="relative w-[520px] h-[720px] bg-[#e3d5b8] p-14 manila-shadow flex flex-col border-2 border-black/10 z-10 overflow-hidden group cursor-crosshair">
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/handmade-paper.png")' }}></div>
              
              <div className="absolute top-8 left-10 flex items-center gap-3">
                 <div className="bg-black text-[#e3d5b8] px-2 py-0.5 text-[12px] font-black pixel-text tracking-tighter shadow-md">YFLC_FOUNDATION</div>
                 <div className="text-[10px] text-black/40 font-bold tracking-tighter border-l-2 border-black/10 pl-3 uppercase">FileRef: {form.id}</div>
              </div>

              <div className="mt-10 border-b-4 border-double border-black/20 pb-5 mb-8 text-center">
                <h2 className="text-4xl font-black uppercase text-black/80 pixel-text tracking-tighter">Budget Requisition</h2>
              </div>

              <div className="space-y-6 text-[#1a1a1a] typewriter font-bold">
                <section>
                  <label className="text-[10px] font-black block opacity-40 mb-1 tracking-widest uppercase">Applicant Name</label>
                  <p className="text-2xl border-b-2 border-black/10 pb-1 leading-none uppercase">{form.applicantName}</p>
                </section>

                <div className="grid grid-cols-2 gap-8">
                  <section>
                    <label className="text-[10px] font-black block opacity-40 mb-1 tracking-widest uppercase">Credit Score</label>
                    <p className={`text-4xl font-black ${form.creditScore > 650 ? 'text-green-800' : form.creditScore < 450 ? 'text-red-800' : 'text-black'}`}>{form.creditScore}</p>
                  </section>
                  <section>
                    <label className="text-[10px] font-black block opacity-40 mb-1 tracking-widest uppercase">Monthly Income</label>
                    <p className="text-3xl font-black leading-none tracking-tight">${form.monthlyIncome.toLocaleString()}</p>
                  </section>
                </div>

                <section className="bg-black/5 p-5 border-2 border-black/10 shadow-inner relative overflow-hidden group/investigate cursor-[url('https://cur.cursors-4u.net/navigation/nav-1/nav5.cur'),_zoom-in]">
                  <label className="text-[10px] font-black block opacity-40 mb-1 tracking-widest uppercase">Purpose Analysis</label>
                  <p className="text-xl italic leading-tight uppercase">"{form.purpose.label}"</p>
                  <div className="mt-2 text-[9px] text-red-900/60 blur-[3px] group-hover/investigate:blur-0 transition-all uppercase font-black tracking-tight">
                    Investigate: {form.purpose.finePrint}
                  </div>
                  <div className={`absolute top-2 right-2 px-2 py-0.5 text-[8px] font-black text-white ${form.purpose.isNeed ? 'bg-blue-600' : 'bg-orange-600'}`}>
                    {form.purpose.isNeed ? 'PRODUCTIVE' : 'CONSUMER'}
                  </div>
                </section>

                <section className="p-5 border-2 border-black/5 relative">
                  <label className="text-[10px] font-black block opacity-40 mb-1 tracking-widest uppercase">Pledged Asset</label>
                  <p className="text-xl italic leading-tight uppercase">"{form.collateral.name}"</p>
                  <div className="mt-2 flex justify-between items-center text-xs">
                    <span className="opacity-50 uppercase tracking-tighter">Value: ${form.collateral.value.toLocaleString()}</span>
                    {gameState.appraisalMade && (
                       <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`px-3 py-1 border-2 font-black ${gameState.appraisalMade === Appraisal.ASSET ? 'border-blue-800 text-blue-800' : 'border-amber-800 text-amber-800'}`}>
                         {gameState.appraisalMade}
                       </motion.div>
                    )}
                  </div>
                </section>
                <div className="flex justify-between items-end border-t border-black/10 pt-4">
                  <div>
                    <label className="text-[9px] font-black opacity-30 uppercase">Requested Funding</label>
                    <p className="text-4xl font-black tracking-tighter">${form.requestedAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* FEEDBACK SLIP */}
              <AnimatePresence>
                {feedback && (
                  <motion.div 
                    initial={{ x: 600, rotate: 10 }} 
                    animate={{ x: 380, rotate: -2 }} 
                    exit={{ x: 600 }}
                    className={`absolute top-20 w-56 p-6 border-2 border-black shadow-xl z-[60] font-black uppercase text-[10px] leading-tight ${feedback === 'SUSTAINABLE CHOICE' ? 'bg-green-100' : 'bg-yellow-200'}`}
                  >
                     <div className="border-b border-black mb-2 pb-1 text-red-900 font-black">YFLC_FEEDBACK</div>
                     {feedback}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STAMPS */}
              <AnimatePresence>
                {isStamping === Decision.APPROVE && (
                  <motion.div initial={{ scale: 4, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 0.9, rotate: -15 }} className="absolute inset-0 flex items-center justify-center z-50 p-12 pointer-events-none">
                    <div className="border-[14px] border-green-800 text-green-800 p-10 font-black text-7xl stamp-text bg-green-200/10 shadow-[8px_8px_0_rgba(0,0,0,0.1)] pixel-text tracking-tighter">SUSTAINABLE</div>
                  </motion.div>
                )}
                {isStamping === Decision.DENY && (
                  <motion.div initial={{ scale: 4, opacity: 0, rotate: 20 }} animate={{ scale: 1, opacity: 0.9, rotate: 12 }} className="absolute inset-0 flex items-center justify-center z-50 p-12 pointer-events-none">
                    <div className="border-[14px] border-red-800 text-red-800 p-10 font-black text-7xl stamp-text bg-red-200/10 shadow-[8px_8px_0_rgba(0,0,0,0.1)] pixel-text tracking-tighter">HIGH RISK</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* APPRAISAL BUTTONS */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-10 z-50">
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ y: 5 }} 
          onClick={() => handleAppraisal(Appraisal.ASSET)}
          className={`px-8 py-4 bg-blue-900 border-4 border-black text-[#e3d5b8] font-bold shadow-[4px_4px_0_#000] active:shadow-none transition-all uppercase text-sm ${gameState.appraisalMade === Appraisal.ASSET ? 'brightness-125 translate-y-1' : ''}`}
        >
          [1] Appreciating Asset
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ y: 5 }} 
          onClick={() => handleAppraisal(Appraisal.LIABILITY)}
          className={`px-8 py-4 bg-amber-900 border-4 border-black text-[#e3d5b8] font-bold shadow-[4px_4px_0_#000] active:shadow-none transition-all uppercase text-sm ${gameState.appraisalMade === Appraisal.LIABILITY ? 'brightness-125 translate-y-1' : ''}`}
        >
          [2] Depreciating Liability
        </motion.button>
      </div>

      {/* FINAL DECISION STAMPS */}
      <div className="absolute bottom-12 left-12 z-50">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ y: 8 }} onClick={() => handleDecision(Decision.DENY)} disabled={!gameState.appraisalMade || !!isStamping} className={`rubber-stamp pixel-btn-red w-40 h-44 border-4 border-black flex flex-col items-center justify-end pb-8 transition-all ${(!gameState.appraisalMade || !!isStamping) ? 'opacity-20 saturate-0 pointer-events-none' : ''}`}>
          <div className="text-red-400 font-black text-2xl pixel-text mb-2 tracking-tighter">DENY</div>
          <div className="text-red-900/50 text-[11px] font-black tracking-widest uppercase">[D]</div>
        </motion.button>
      </div>

      <div className="absolute bottom-12 right-12 z-50">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ y: 8 }} onClick={() => handleDecision(Decision.APPROVE)} disabled={!gameState.appraisalMade || !!isStamping} className={`rubber-stamp pixel-btn-green w-40 h-44 border-4 border-black flex flex-col items-center justify-end pb-8 transition-all ${(!gameState.appraisalMade || !!isStamping) ? 'opacity-20 saturate-0 pointer-events-none' : ''}`}>
          <div className="text-green-400 font-black text-2xl pixel-text mb-2 tracking-tighter">GRANT</div>
          <div className="text-green-900/50 text-[11px] font-black tracking-widest uppercase">[A]</div>
        </motion.button>
      </div>

      {/* YFLC HANDBOOK TOGGLE */}
      <motion.div 
        animate={{ y: isHandbookOpen ? 0 : 420 }} 
        className="absolute bottom-0 w-full max-w-2xl bg-[#fdf5e6] border-t-8 border-x-8 border-[#1a1a1a] p-10 z-[200] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center"
      >
        <button onClick={() => setIsHandbookOpen(!isHandbookOpen)} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1a1a1a] px-8 py-2 text-[#e3d5b8] font-bold rounded-t-lg hover:bg-black transition-colors uppercase text-xs border-b-0 border-4 border-black shadow-xl">
          {isHandbookOpen ? 'Close Handbook' : 'YFLC Foundation Handbook'}
        </button>
        <div className="grid grid-cols-2 gap-10 text-black/80 font-bold uppercase leading-tight typewriter text-xs">
          <section>
            <h5 className="text-blue-900 border-b-2 border-blue-900 mb-2 font-black">ASSET vs LIABILITY</h5>
            <p className="opacity-70 mb-2">Assets grow in value or provide income. Backing these is sustainable.</p>
            <p className="opacity-70">Liabilities drain value over time. They are poor backing for debt.</p>
          </section>
          <section>
            <h5 className="text-red-900 border-b-2 border-red-900 mb-2 font-black">CAPACITY TO PAY</h5>
            <p className="opacity-70 mb-2">Check for 'Productive Debt' (Needs). These applicants deserve lower thresholds.</p>
            <p className="opacity-70 font-black text-red-700">Warning: Debt-to-Income ratios above 3.0 are Toxic.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
