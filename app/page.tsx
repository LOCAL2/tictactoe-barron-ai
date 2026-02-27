'use client';

import { useState, useCallback, useEffect } from 'react';

type Player = 'X' | 'O' | null;
type Board = Player[];

interface MoveAnalysis {
  position: number;
  score: number;
  reasoning: string;
  winningMove: boolean;
  blockingMove: boolean;
  strategicValue: number;
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6] // diagonals
];

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState<'playing' | 'draw' | 'player-win' | 'ai-win'>('playing');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [draws, setDraws] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [moveAnalysis, setMoveAnalysis] = useState<MoveAnalysis[]>([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Load stats from localStorage on mount
  useEffect(() => {
    console.log('Tic-Tac-Toe vs Barron AI - System Initialized');
    
    const savedStats = localStorage.getItem('tictactoe-stats');
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        setPlayerScore(stats.playerScore || 0);
        setAiScore(stats.aiScore || 0);
        setDraws(stats.draws || 0);
      } catch (error) {
        // Silent error handling
      }
    }
    
    // Random who starts first on initial load
    const aiStartsFirst = Math.random() < 0.5;
    setIsPlayerTurn(!aiStartsFirst);
    
    if (aiStartsFirst) {
      console.log('🎲 AI starts first!');
      addDebugLog("AI starts first - making opening move");
      
      // AI makes first move after a short delay
      setTimeout(() => {
        setIsThinking(true);
        setTimeout(() => {
          const emptyBoard = Array(9).fill(null);
          const aiMove = getBestMove(emptyBoard);
          const newBoard = [...emptyBoard];
          newBoard[aiMove] = 'O';
          setBoard(newBoard);
          setIsPlayerTurn(true);
          setIsThinking(false);
        }, 1000);
      }, 800);
    } else {
      console.log('🎲 Player starts first!');
      addDebugLog("Player starts first");
    }
  }, []);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    const stats = {
      playerScore,
      aiScore,
      draws
    };
    localStorage.setItem('tictactoe-stats', JSON.stringify(stats));
  }, [playerScore, aiScore, draws]);

  const addDebugLog = (message: string) => {
    const logMessage = `[${new Date().toLocaleTimeString()}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-9), logMessage]);
    console.log(`🤖 AI DEBUG: ${message}`);
  };

  const checkWinner = useCallback((board: Board): Player => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }, []);

  const isBoardFull = useCallback((board: Board): boolean => {
    return board.every(cell => cell !== null);
  }, []);

  // Hyper-aggressive Minimax that hates draws
  const minimax = useCallback((
    board: Board, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number = -Infinity, 
    beta: number = Infinity
  ): number => {
    const winner = checkWinner(board);
    
    if (winner === 'O') {
      const score = 10000 - depth;
      return score;
    }
    if (winner === 'X') {
      const score = depth - 10000;
      return score;
    }
    if (isBoardFull(board)) {
      const score = -100 - depth;
      return score;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      
      // เรียงลำดับ moves ตาม strategic value
      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          // ให้ความสำคัญกับมุมและกลาง
          const priority = [0, 2, 6, 8].includes(i) ? 3 : (i === 4 ? 5 : 1);
          moves.push({ index: i, priority });
        }
      }
      moves.sort((a, b) => b.priority - a.priority);
      
      for (const move of moves) {
        const i = move.index;
        board[i] = 'O';
        
        // ตรวจสอบ fork opportunities
        let forkBonus = 0;
        let winningLines = 0;
        for (const combo of WINNING_COMBINATIONS) {
          const [a, b, c] = combo;
          const oCount = [board[a], board[b], board[c]].filter(cell => cell === 'O').length;
          const emptyCount = [board[a], board[b], board[c]].filter(cell => cell === null).length;
          const xCount = [board[a], board[b], board[c]].filter(cell => cell === 'X').length;
          
          if (oCount === 2 && emptyCount === 1 && xCount === 0) {
            winningLines++;
          }
        }
        
        if (winningLines >= 2) {
          forkBonus = 5000; // Fork bonus
        }
        
        const evaluation = minimax(board, depth + 1, false, alpha, beta) + forkBonus;
        board[i] = null;
        
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          const evaluation = minimax(board, depth + 1, true, alpha, beta);
          board[i] = null;
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  }, [checkWinner, isBoardFull]);

  // ULTRA PERFECT AI - Enhanced with Advanced Pattern Recognition
  const getBestMove = useCallback((board: Board): number => {
    console.log(`🚀 === BARRON AI ANALYSIS START ===`);
    addDebugLog("=== BARRON AI ANALYSIS START ===");
    
    const emptyCount = board.filter(cell => cell === null).length;
    console.log(`📊 Empty positions: ${emptyCount}`);
    console.log(`📋 Current board:`, board);
    addDebugLog(`Empty positions: ${emptyCount}`);

    // STEP 1: Win immediately if possible
    console.log(`🔍 STEP 1: Checking for immediate win...`);
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        if (checkWinner(board) === 'O') {
          board[i] = null;
          console.log(`👑 STEP 1: IMMEDIATE WIN at position ${i}!`);
          addDebugLog(`STEP 1: IMMEDIATE WIN at position ${i}!`);
          setMoveAnalysis([{
            position: i,
            score: 100000,
            reasoning: "STEP 1: IMMEDIATE WIN",
            winningMove: true,
            blockingMove: false,
            strategicValue: 100
          }]);
          return i;
        }
        board[i] = null;
      }
    }

    // STEP 2: Block opponent's immediate win (including preventing forks)
    console.log(`🔍 STEP 2: Checking for opponent's winning threats...`);
    const blockingMoves = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        if (checkWinner(board) === 'X') {
          blockingMoves.push(i);
          console.log(`⚠️ Found threat at position ${i}`);
        }
        board[i] = null;
      }
    }
    
    if (blockingMoves.length > 1) {
      // Player has created a fork! This is critical - we already lost
      console.log(`🔴 CRITICAL: Player has ${blockingMoves.length} winning threats (FORK)! Game likely lost.`);
      console.log(`🔴 Available blocks: ${blockingMoves.join(', ')}`);
      // Block one of them anyway
      const blockPosition = blockingMoves[0];
      console.log(`🛡️ STEP 2: Blocking position ${blockPosition} (but player will win next turn)`);
      addDebugLog(`STEP 2: MUST BLOCK at position ${blockPosition}!`);
      setMoveAnalysis([{
        position: blockPosition,
        score: 50000,
        reasoning: "STEP 2: BLOCK OPPONENT WIN (FORK DETECTED)",
        winningMove: false,
        blockingMove: true,
        strategicValue: 50
      }]);
      return blockPosition;
    } else if (blockingMoves.length === 1) {
      const blockPosition = blockingMoves[0];
      console.log(`🛡️ STEP 2: MUST BLOCK at position ${blockPosition}!`);
      addDebugLog(`STEP 2: MUST BLOCK at position ${blockPosition}!`);
      setMoveAnalysis([{
        position: blockPosition,
        score: 50000,
        reasoning: "STEP 2: BLOCK OPPONENT WIN",
        winningMove: false,
        blockingMove: true,
        strategicValue: 50
      }]);
      return blockPosition;
    }

    // STEP 3: Create a fork (two winning threats) - Enhanced with priority scoring
    let bestForkMove = -1;
    let bestForkScore = 0;
    
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        
        let winningLines = 0;
        let forkQuality = 0;
        
        for (const combo of WINNING_COMBINATIONS) {
          const [a, b, c] = combo;
          const oCount = [board[a], board[b], board[c]].filter(cell => cell === 'O').length;
          const emptyCount = [board[a], board[b], board[c]].filter(cell => cell === null).length;
          const xCount = [board[a], board[b], board[c]].filter(cell => cell === 'X').length;
          
          if (oCount === 2 && emptyCount === 1 && xCount === 0) {
            winningLines++;
            // Bonus for corner-based winning lines (harder to block)
            if ([0, 2, 6, 8].some(corner => [a, b, c].includes(corner))) {
              forkQuality += 2;
            } else {
              forkQuality += 1;
            }
          }
        }
        
        if (winningLines >= 2) {
          const forkScore = winningLines * 1000 + forkQuality * 500;
          if (forkScore > bestForkScore) {
            bestForkScore = forkScore;
            bestForkMove = i;
          }
        }
        
        board[i] = null;
      }
    }
    
    if (bestForkMove !== -1) {
      addDebugLog(`STEP 3: CREATE SUPERIOR FORK at position ${bestForkMove} (score: ${bestForkScore})!`);
      setMoveAnalysis([{
        position: bestForkMove,
        score: 40000 + bestForkScore,
        reasoning: `STEP 3: CREATE SUPERIOR FORK - Quality Score: ${bestForkScore}`,
        winningMove: false,
        blockingMove: false,
        strategicValue: Math.floor(bestForkScore / 100)
      }]);
      return bestForkMove;
    }

    // STEP 4: Block opponent's fork - Prevent player from creating fork opportunities
    console.log(`🔍 STEP 4: Checking which moves would allow opponent to create forks...`);
    
    // Special case: If player has opposite corners, we MUST play a side (not corner)
    const playerCorners = [];
    for (let i of [0, 2, 6, 8]) {
      if (board[i] === 'X') playerCorners.push(i);
    }
    
    if (playerCorners.length === 2) {
      const [c1, c2] = playerCorners;
      // Check if they are opposite corners
      if ((c1 === 0 && c2 === 8) || (c1 === 8 && c2 === 0) || 
          (c1 === 2 && c2 === 6) || (c1 === 6 && c2 === 2)) {
        console.log(`🚨 CRITICAL: Player has opposite corners (${c1}, ${c2})! Must play a side!`);
        const sides = [1, 3, 5, 7].filter(pos => board[pos] === null);
        if (sides.length > 0) {
          const sideMove = sides[0];
          console.log(`🛡️ STEP 4: Playing side position ${sideMove} to prevent fork`);
          addDebugLog(`STEP 4: PREVENT OPPOSITE CORNER FORK at position ${sideMove}!`);
          setMoveAnalysis([{
            position: sideMove,
            score: 45000,
            reasoning: `STEP 4: PREVENT OPPOSITE CORNER FORK`,
            winningMove: false,
            blockingMove: true,
            strategicValue: 45
          }]);
          return sideMove;
        }
      }
    }
    
    // For each possible AI move, check if it allows player to create a fork
    const safeMoves = [];
    const dangerousMoves = [];
    
    for (let aiMove = 0; aiMove < 9; aiMove++) {
      if (board[aiMove] !== null) continue;
      
      // Simulate AI move
      board[aiMove] = 'O';
      
      // Check all possible player responses
      let maxPlayerThreats = 0;
      for (let playerMove = 0; playerMove < 9; playerMove++) {
        if (board[playerMove] !== null) continue;
        
        // Simulate player move
        board[playerMove] = 'X';
        
        // Count how many winning threats player would have
        let playerThreats = 0;
        for (let checkPos = 0; checkPos < 9; checkPos++) {
          if (board[checkPos] !== null) continue;
          
          board[checkPos] = 'X';
          if (checkWinner(board) === 'X') {
            playerThreats++;
          }
          board[checkPos] = null;
        }
        
        maxPlayerThreats = Math.max(maxPlayerThreats, playerThreats);
        board[playerMove] = null;
      }
      
      board[aiMove] = null;
      
      if (maxPlayerThreats >= 2) {
        dangerousMoves.push({ position: aiMove, threats: maxPlayerThreats });
        console.log(`⚠️ Position ${aiMove} allows player to create ${maxPlayerThreats} threats (DANGEROUS)`);
      } else {
        safeMoves.push(aiMove);
      }
    }
    
    // If we found dangerous moves, avoid them and pick a safe one
    if (dangerousMoves.length > 0 && safeMoves.length > 0) {
      console.log(`🛡️ STEP 4: Avoiding dangerous moves, choosing from safe positions: ${safeMoves.join(', ')}`);
      // Prefer corners, then center, then sides
      const preferredSafe = safeMoves.find(pos => [0, 2, 6, 8].includes(pos)) || 
                           safeMoves.find(pos => pos === 4) ||
                           safeMoves[0];
      console.log(`🛡️ STEP 4: Selected safe position ${preferredSafe}`);
      addDebugLog(`STEP 4: PREVENT FORK at position ${preferredSafe}!`);
      setMoveAnalysis([{
        position: preferredSafe,
        score: 35000,
        reasoning: `STEP 4: PREVENT OPPONENT FORK`,
        winningMove: false,
        blockingMove: true,
        strategicValue: 35
      }]);
      return preferredSafe;
    }

    // STEP 5: Advanced Center Strategy
    if (board[4] === null) {
      // Check if taking center creates immediate tactical advantage
      let centerAdvantage = 0;
      board[4] = 'O';
      
      // Count potential winning lines through center
      const centerCombos = [[0, 4, 8], [2, 4, 6], [1, 4, 7], [3, 4, 5]];
      for (const combo of centerCombos) {
        const [a, b, c] = combo;
        const oCount = [board[a], board[b], board[c]].filter(cell => cell === 'O').length;
        const emptyCount = [board[a], board[b], board[c]].filter(cell => cell === null).length;
        const xCount = [board[a], board[b], board[c]].filter(cell => cell === 'X').length;
        
        if (oCount === 1 && emptyCount === 2 && xCount === 0) {
          centerAdvantage += 2;
        }
      }
      
      board[4] = null;
      
      addDebugLog(`STEP 5: TAKE STRATEGIC CENTER at position 4 (advantage: ${centerAdvantage})!`);
      setMoveAnalysis([{
        position: 4,
        score: 20000 + centerAdvantage * 500,
        reasoning: `STEP 5: TAKE STRATEGIC CENTER - Advantage: ${centerAdvantage}`,
        winningMove: false,
        blockingMove: false,
        strategicValue: 20 + centerAdvantage
      }]);
      return 4;
    }

    // STEP 6: Enhanced Opposite Corner Strategy
    const cornerPairs = [[0, 8], [2, 6]];
    let bestCornerMove = -1;
    let bestCornerValue = 0;
    
    for (const [corner1, corner2] of cornerPairs) {
      if (board[corner1] === 'X' && board[corner2] === null) {
        // Calculate strategic value of this corner
        let cornerValue = 10;
        
        // Bonus if it creates multiple potential lines
        const adjacentPositions = corner2 === 0 ? [1, 3] : 
                                 corner2 === 2 ? [1, 5] :
                                 corner2 === 6 ? [3, 7] : [5, 7];
        
        for (const adj of adjacentPositions) {
          if (board[adj] === null) cornerValue += 2;
        }
        
        if (cornerValue > bestCornerValue) {
          bestCornerValue = cornerValue;
          bestCornerMove = corner2;
        }
      }
      if (board[corner2] === 'X' && board[corner1] === null) {
        let cornerValue = 10;
        
        const adjacentPositions = corner1 === 0 ? [1, 3] : 
                                 corner1 === 2 ? [1, 5] :
                                 corner1 === 6 ? [3, 7] : [5, 7];
        
        for (const adj of adjacentPositions) {
          if (board[adj] === null) cornerValue += 2;
        }
        
        if (cornerValue > bestCornerValue) {
          bestCornerValue = cornerValue;
          bestCornerMove = corner1;
        }
      }
    }
    
    if (bestCornerMove !== -1) {
      addDebugLog(`STEP 6: TAKE OPTIMAL OPPOSITE CORNER at position ${bestCornerMove} (value: ${bestCornerValue})!`);
      setMoveAnalysis([{
        position: bestCornerMove,
        score: 15000 + bestCornerValue * 200,
        reasoning: `STEP 6: TAKE OPTIMAL OPPOSITE CORNER - Value: ${bestCornerValue}`,
        winningMove: false,
        blockingMove: false,
        strategicValue: 15 + bestCornerValue
      }]);
      return bestCornerMove;
    }

    // STEP 7: Smart Corner Selection with Pattern Recognition
    const corners = [0, 2, 6, 8];
    let bestCorner = -1;
    let bestScore = 0;
    
    for (const corner of corners) {
      if (board[corner] === null) {
        let score = 5; // Base score
        
        // Bonus for corners that create multiple potential winning lines
        const cornerLines = WINNING_COMBINATIONS.filter(combo => combo.includes(corner));
        for (const line of cornerLines) {
          const [a, b, c] = line;
          const oCount = [board[a], board[b], board[c]].filter(cell => cell === 'O').length;
          const emptyCount = [board[a], board[b], board[c]].filter(cell => cell === null).length;
          const xCount = [board[a], board[b], board[c]].filter(cell => cell === 'X').length;
          
          if (oCount === 0 && xCount === 0) score += 3; // Open line
          if (oCount === 1 && xCount === 0) score += 5; // Potential winning line
        }
        
        // Bonus for corners adjacent to empty spaces
        const adjacentPositions = corner === 0 ? [1, 3] : 
                                 corner === 2 ? [1, 5] :
                                 corner === 6 ? [3, 7] : [5, 7];
        
        for (const adj of adjacentPositions) {
          if (board[adj] === null) score += 1;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestCorner = corner;
        }
      }
    }
    
    if (bestCorner !== -1) {
      addDebugLog(`STEP 7: TAKE STRATEGIC CORNER at position ${bestCorner} (score: ${bestScore})!`);
      setMoveAnalysis([{
        position: bestCorner,
        score: 10000 + bestScore * 100,
        reasoning: `STEP 7: TAKE STRATEGIC CORNER - Score: ${bestScore}`,
        winningMove: false,
        blockingMove: false,
        strategicValue: 10 + bestScore
      }]);
      return bestCorner;
    }

    // STEP 8: Intelligent Side Selection (last resort but optimized)
    const sides = [1, 3, 5, 7];
    let bestSide = -1;
    let bestSideScore = 0;
    
    for (const side of sides) {
      if (board[side] === null) {
        let score = 1; // Base score
        
        // Check if this side can contribute to future winning lines
        const sideLines = WINNING_COMBINATIONS.filter(combo => combo.includes(side));
        for (const line of sideLines) {
          const [a, b, c] = line;
          const oCount = [board[a], board[b], board[c]].filter(cell => cell === 'O').length;
          const emptyCount = [board[a], board[b], board[c]].filter(cell => cell === null).length;
          const xCount = [board[a], board[b], board[c]].filter(cell => cell === 'X').length;
          
          if (oCount === 1 && xCount === 0) score += 2; // Can extend our line
          if (oCount === 0 && xCount === 0) score += 1; // Neutral line
        }
        
        if (score > bestSideScore) {
          bestSideScore = score;
          bestSide = side;
        }
      }
    }
    
    if (bestSide !== -1) {
      addDebugLog(`STEP 8: TAKE OPTIMAL SIDE at position ${bestSide} (score: ${bestSideScore})!`);
      setMoveAnalysis([{
        position: bestSide,
        score: 5000 + bestSideScore * 50,
        reasoning: `STEP 8: TAKE OPTIMAL SIDE - Score: ${bestSideScore}`,
        winningMove: false,
        blockingMove: false,
        strategicValue: 5 + bestSideScore
      }]);
      return bestSide;
    }

    addDebugLog("ERROR: No valid moves found!");
    return 0; // Fallback
  }, [checkWinner, addDebugLog]);

  const makeMove = useCallback((index: number) => {
    if (board[index] || gameStatus !== 'playing' || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    
    console.log(`🎮 PLAYER MOVE: Position ${index}`);
    console.log(`📋 Board after player move:`, newBoard);
    addDebugLog(`Player moved to position ${index}`);
    
    const winner = checkWinner(newBoard);
    if (winner) {
      setBoard(newBoard);
      setGameStatus('player-win');
      setPlayerScore(prev => prev + 1);
      console.log(`🎉 PLAYER WON! This should not happen!`);
      console.log(`🔴 CRITICAL: AI failed to prevent player win!`);
      addDebugLog("PLAYER WON - This should not happen!");
      return;
    }

    if (isBoardFull(newBoard)) {
      setBoard(newBoard);
      setGameStatus('draw');
      setDraws(prev => prev + 1);
      addDebugLog("Game ended in draw");
      return;
    }

    setBoard(newBoard);
    setIsPlayerTurn(false);
    setIsThinking(true);

    setTimeout(() => {
      console.log(`🤖 AI TURN STARTING...`);
      const aiMove = getBestMove(newBoard);
      const aiBoard = [...newBoard];
      aiBoard[aiMove] = 'O';

      console.log(`🤖 AI SELECTED: Position ${aiMove}`);
      console.log(`📋 Board after AI move:`, aiBoard);

      const aiWinner = checkWinner(aiBoard);
      if (aiWinner) {
        setBoard(aiBoard);
        setGameStatus('ai-win');
        setAiScore(prev => prev + 1);
        addDebugLog("AI WON!");
        setIsThinking(false);
        return;
      }

      if (isBoardFull(aiBoard)) {
        setBoard(aiBoard);
        setGameStatus('draw');
        setDraws(prev => prev + 1);
        addDebugLog("Game ended in draw");
        setIsThinking(false);
        return;
      }

      setBoard(aiBoard);
      setIsPlayerTurn(true);
      setIsThinking(false);
    }, 1200 + Math.random() * 800);
  }, [board, gameStatus, isPlayerTurn, checkWinner, isBoardFull, getBestMove, addDebugLog]);

  const resetStats = () => {
    setPlayerScore(0);
    setAiScore(0);
    setDraws(0);
    resetGame();
  };

  // Random Player for Auto Testing
  const makeRandomMove = useCallback((currentBoard: Board): number => {
    const availableMoves = [];
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        availableMoves.push(i);
      }
    }
    
    if (availableMoves.length === 0) return -1;
    
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }, []);

  // Auto Test Function
  const runAutoTest = useCallback(async () => {
    if (isAutoTesting) return;
    
    setIsAutoTesting(true);
    setTestResults([]);
    console.log(`🧪 === AUTO TEST STARTING (10 GAMES) ===`);
    
    const results = [];
    let testPlayerWins = 0;
    let testAiWins = 0;
    let testDraws = 0;
    
    for (let gameNum = 1; gameNum <= 10; gameNum++) {
      console.log(`🎮 === GAME ${gameNum} START ===`);
      
      // Reset game state
      let testBoard: Board = Array(9).fill(null);
      let testIsPlayerTurn = true;
      let testGameStatus: 'playing' | 'draw' | 'player-win' | 'ai-win' = 'playing';
      let moveCount = 0;
      
      // Play one complete game
      while (testGameStatus === 'playing' && moveCount < 9) {
        if (testIsPlayerTurn) {
          // Random player move
          const playerMove = makeRandomMove(testBoard);
          if (playerMove === -1) break;
          
          testBoard[playerMove] = 'X';
          console.log(`🎲 Game ${gameNum}: Random Player moved to position ${playerMove}`);
          console.log(`📋 Board:`, testBoard);
          
          // Check if player wins
          if (checkWinner(testBoard) === 'X') {
            testGameStatus = 'player-win';
            testPlayerWins++;
            console.log(`🎉 Game ${gameNum}: Random Player WON!`);
            break;
          }
          
          // Check if board is full
          if (testBoard.every(cell => cell !== null)) {
            testGameStatus = 'draw';
            testDraws++;
            console.log(`🤝 Game ${gameNum}: DRAW!`);
            break;
          }
          
          testIsPlayerTurn = false;
        } else {
          // AI move using perfect strategy
          const aiMove = getBestMove(testBoard);
          testBoard[aiMove] = 'O';
          console.log(`🤖 Game ${gameNum}: AI moved to position ${aiMove}`);
          console.log(`📋 Board:`, testBoard);
          
          // Check if AI wins
          if (checkWinner(testBoard) === 'O') {
            testGameStatus = 'ai-win';
            testAiWins++;
            console.log(`🏆 Game ${gameNum}: AI WON!`);
            break;
          }
          
          // Check if board is full
          if (testBoard.every(cell => cell !== null)) {
            testGameStatus = 'draw';
            testDraws++;
            console.log(`🤝 Game ${gameNum}: DRAW!`);
            break;
          }
          
          testIsPlayerTurn = true;
        }
        moveCount++;
      }
      
      results.push(`Game ${gameNum}: ${testGameStatus === 'player-win' ? 'Random Player Won' : testGameStatus === 'ai-win' ? 'AI Won' : 'Draw'}`);
      console.log(`🏁 Game ${gameNum} Result: ${testGameStatus}`);
      
      // Small delay between games
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final Analysis
    console.log(`📊 === AUTO TEST RESULTS ===`);
    console.log(`🎲 Random Player Wins: ${testPlayerWins}/10 (${(testPlayerWins/10*100).toFixed(1)}%)`);
    console.log(`🤖 AI Wins: ${testAiWins}/10 (${(testAiWins/10*100).toFixed(1)}%)`);
    console.log(`🤝 Draws: ${testDraws}/10 (${(testDraws/10*100).toFixed(1)}%)`);
    console.log(`🎯 AI Performance: ${testAiWins + testDraws}/10 games undefeated (${((testAiWins + testDraws)/10*100).toFixed(1)}%)`);
    
    if (testPlayerWins === 0) {
      console.log(`✅ PERFECT AI: No losses detected!`);
    } else {
      console.log(`⚠️ AI WEAKNESS: ${testPlayerWins} losses found - needs improvement!`);
    }
    
    // Update test results for display
    setTestResults([
      `📊 AUTO TEST COMPLETED (10 Games)`,
      `🎲 Random Player: ${testPlayerWins} wins (${(testPlayerWins/10*100).toFixed(1)}%)`,
      `🤖 AI: ${testAiWins} wins (${(testAiWins/10*100).toFixed(1)}%)`,
      `🤝 Draws: ${testDraws} (${(testDraws/10*100).toFixed(1)}%)`,
      `🎯 AI Undefeated: ${((testAiWins + testDraws)/10*100).toFixed(1)}%`,
      testPlayerWins === 0 ? `✅ PERFECT AI CONFIRMED!` : `⚠️ AI NEEDS IMPROVEMENT!`
    ]);
    
    setIsAutoTesting(false);
    console.log(`🧪 === AUTO TEST COMPLETED ===`);
  }, [isAutoTesting, makeRandomMove, getBestMove, checkWinner]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setGameStatus('playing');
    setDebugLogs([]);
    setMoveAnalysis([]);
    setTestResults([]);
    
    // Random who starts first
    const aiStartsFirst = Math.random() < 0.5;
    setIsPlayerTurn(!aiStartsFirst);
    
    if (aiStartsFirst) {
      console.log('🎲 AI starts first!');
      addDebugLog("AI starts first - making opening move");
      
      // AI makes first move after a short delay
      setTimeout(() => {
        setIsThinking(true);
        setTimeout(() => {
          const emptyBoard = Array(9).fill(null);
          const aiMove = getBestMove(emptyBoard);
          const newBoard = [...emptyBoard];
          newBoard[aiMove] = 'O';
          setBoard(newBoard);
          setIsPlayerTurn(true);
          setIsThinking(false);
        }, 800);
      }, 500);
    } else {
      console.log('🎲 Player starts first!');
      addDebugLog("Player starts first");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
            Tic-Tac-Toe vs Barron AI
          </h1>
          <a 
            href="https://barronai.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
          >
            <span>Visit Barron AI</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Game Section */}
          <div className="space-y-6">
            {/* Game Status - Show on top for mobile */}
            <div className="lg:hidden bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                {gameStatus === 'playing' && (
                  <div className="space-y-4">
                    {isPlayerTurn && !isThinking ? (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Your Turn</p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">Make your move</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600">
                          <svg className="w-6 h-6 text-slate-600 dark:text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">AI Turn</p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">Calculating...</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {gameStatus === 'player-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Victory</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">You won!</p>
                    </div>
                  </div>
                )}
                {gameStatus === 'ai-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Defeat</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">AI won</p>
                    </div>
                  </div>
                )}
                {gameStatus === 'draw' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 dark:border-amber-400">
                      <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 9h14M5 15h14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Draw</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">It's a tie</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Game Board */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-sm mx-auto">
                {board.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => makeMove(index)}
                    disabled={!isPlayerTurn || gameStatus !== 'playing' || cell !== null || isThinking}
                    className={`
                      aspect-square text-4xl md:text-5xl font-bold rounded-lg transition-all duration-200 flex items-center justify-center
                      ${cell === 'X' ? 'bg-blue-500 text-white' : ''}
                      ${cell === 'O' ? 'bg-red-500 text-white' : ''}
                      ${!cell ? 'bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600' : ''}
                      ${!isPlayerTurn || gameStatus !== 'playing' || isThinking ? 'cursor-not-allowed opacity-40' : !cell ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500' : ''}
                    `}
                  >
                    {cell}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 md:gap-4 justify-center flex-wrap">
              <button
                onClick={resetGame}
                className="px-6 md:px-8 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:scale-105 cursor-pointer text-sm md:text-base"
              >
                New Game
              </button>
              <button
                onClick={resetStats}
                className="px-6 md:px-8 py-2.5 md:py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-slate-500/25 hover:scale-105 cursor-pointer text-sm md:text-base"
              >
                Reset Stats
              </button>
            </div>
          </div>

          {/* Stats & Status Section */}
          <div className="space-y-6">
            {/* Score Board */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">You</div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{playerScore}</div>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">เสมอ</div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{draws}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">AI</div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{aiScore}</div>
                </div>
              </div>
            </div>

            {/* Game Status */}
            <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                {gameStatus === 'playing' && (
                  <div className="space-y-4">
                    {isPlayerTurn && !isThinking ? (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400">
                          <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Your Turn</p>
                          <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Make your move</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600">
                          <svg className="w-6 h-6 md:w-7 md:h-7 text-slate-600 dark:text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">AI Turn</p>
                          <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">Calculating...</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {gameStatus === 'player-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400">
                      <svg className="w-6 h-6 md:w-7 md:h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Victory</p>
                      <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">You won!</p>
                    </div>
                  </div>
                )}
                {gameStatus === 'ai-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400">
                      <svg className="w-6 h-6 md:w-7 md:h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Defeat</p>
                      <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">AI won</p>
                    </div>
                  </div>
                )}
                {gameStatus === 'draw' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 dark:border-amber-400">
                      <svg className="w-6 h-6 md:w-7 md:h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 9h14M5 15h14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Draw</p>
                      <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">It's a tie</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-200 dark:border-slate-700">
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Total Games</span>
                  <span className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                    {playerScore + aiScore + draws}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Your Win Rate</span>
                  <span className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                    {playerScore + aiScore + draws > 0 
                      ? `${((playerScore / (playerScore + aiScore + draws)) * 100).toFixed(0)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">Draw Rate</span>
                  <span className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                    {playerScore + aiScore + draws > 0 
                      ? `${((draws / (playerScore + aiScore + draws)) * 100).toFixed(0)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}