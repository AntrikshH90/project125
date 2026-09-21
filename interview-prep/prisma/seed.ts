// Seed data: curated MCQs across aptitude, technical, HR, and a strong
// company-specific bank (Google, Microsoft, Amazon, Meta, NVIDIA).
// Company questions are based on commonly reported patterns and topics —
// the prediction engine will rank them by recency and popularity.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  category: "aptitude" | "technical" | "hr";
  subTopic: string;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  company?: string;
  role?: string;
  askedYear?: number;
  lastReported?: Date;
  timesReported?: number;
  source?: string;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const QUESTIONS: Q[] = [
  // ===== APTITUDE =====
  {
    category: "aptitude",
    subTopic: "probability",
    difficulty: "medium",
    prompt:
      "You flip a fair coin 3 times. What is the probability of getting exactly 2 heads?",
    options: ["1/8", "2/8", "3/8", "4/8"],
    correctIdx: 2,
    explanation:
      "C(3,2) favorable outcomes = 3. Total outcomes = 2³ = 8. So 3/8.",
  },
  {
    category: "aptitude",
    subTopic: "probability",
    difficulty: "easy",
    prompt: "Two dice are rolled. Probability that the sum is 7?",
    options: ["1/6", "1/8", "1/9", "2/9"],
    correctIdx: 0,
    explanation: "Favorable pairs: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6. 6/36 = 1/6.",
  },
  {
    category: "aptitude",
    subTopic: "time-speed-distance",
    difficulty: "easy",
    prompt: "A train 120 m long crosses a pole in 12 s. Speed in km/h?",
    options: ["24", "30", "36", "40"],
    correctIdx: 2,
    explanation: "120/12 = 10 m/s = 36 km/h.",
  },
  {
    category: "aptitude",
    subTopic: "time-speed-distance",
    difficulty: "medium",
    prompt:
      "Two trains 140 m and 160 m long run in opposite directions at 60 km/h and 40 km/h. Time to cross each other?",
    options: ["10 s", "10.8 s", "12 s", "15 s"],
    correctIdx: 1,
    explanation: "Total length 300 m, relative speed 100 km/h = 27.78 m/s. 300/27.78 ≈ 10.8 s.",
  },
  {
    category: "aptitude",
    subTopic: "percentages",
    difficulty: "easy",
    prompt: "A price is increased by 20% then decreased by 20%. Net change?",
    options: ["0%", "4% loss", "4% gain", "2% loss"],
    correctIdx: 1,
    explanation: "1.2 × 0.8 = 0.96 → 4% loss.",
  },
  {
    category: "aptitude",
    subTopic: "ratios",
    difficulty: "medium",
    prompt:
      "Ratio of ages A:B is 4:5. After 5 years it becomes 5:6. Present age of A?",
    options: ["20", "25", "30", "15"],
    correctIdx: 0,
    explanation: "Let A=4k,B=5k. (4k+5)/(5k+5)=5/6 → 24k+30=25k+25 → k=5. A=20.",
  },
  {
    category: "aptitude",
    subTopic: "permutations",
    difficulty: "medium",
    prompt: "How many ways to arrange the letters of the word 'BANANA'?",
    options: ["60", "120", "720", "90"],
    correctIdx: 0,
    explanation: "6!/(3!2!1!) = 720/12 = 60.",
  },
  {
    category: "aptitude",
    subTopic: "interest",
    difficulty: "medium",
    prompt:
      "Sum doubles in 8 years at simple interest. Rate of interest?",
    options: ["10%", "12.5%", "15%", "20%"],
    correctIdx: 1,
    explanation: "P + P·R·8/100 = 2P → R = 100/8 = 12.5%.",
  },
  {
    category: "aptitude",
    subTopic: "profit-loss",
    difficulty: "medium",
    prompt:
      "Shopkeeper marks up by 40% and gives 10% discount. Profit %?",
    options: ["20%", "26%", "30%", "15%"],
    correctIdx: 1,
    explanation: "1.4 × 0.9 = 1.26 → 26%.",
  },
  {
    category: "aptitude",
    subTopic: "number-system",
    difficulty: "easy",
    prompt: "Smallest number divisible by 12, 15, 20?",
    options: ["30", "60", "90", "120"],
    correctIdx: 1,
    explanation: "LCM(12,15,20) = 60.",
  },
  {
    category: "aptitude",
    subTopic: "work-time",
    difficulty: "medium",
    prompt: "A can do work in 12 days, B in 15 days. Together?",
    options: ["6 2/3 days", "7 days", "6 days", "7.5 days"],
    correctIdx: 0,
    explanation: "1/12 + 1/15 = 9/60 = 3/20 → 20/3 = 6 2/3 days.",
  },
  {
    category: "aptitude",
    subTopic: "mixtures",
    difficulty: "hard",
    prompt:
      "Milk and water in 5:1. To make 3:1, what fraction of mixture should be replaced with water?",
    options: ["1/4", "1/5", "1/3", "1/6"],
    correctIdx: 3,
    explanation:
      "Milk fraction = 5/6. After replacement x of water, milk = (5/6)(1−x) = 3/4 → x = 1/6.",
  },

  // ===== TECHNICAL — general CS =====
  {
    category: "technical",
    subTopic: "data-structures",
    difficulty: "easy",
    prompt: "Which data structure uses LIFO ordering?",
    options: ["Queue", "Stack", "Heap", "Trie"],
    correctIdx: 1,
    explanation: "Stack = Last-In-First-Out.",
  },
  {
    category: "technical",
    subTopic: "data-structures",
    difficulty: "medium",
    prompt: "Average time complexity of hash table lookup?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctIdx: 0,
    explanation: "Amortized O(1) with good hash; worst case O(n) on collisions.",
  },
  {
    category: "technical",
    subTopic: "os",
    difficulty: "medium",
    prompt: "Which scheduling algorithm can cause starvation?",
    options: ["FCFS", "Round Robin", "Priority", "All of these"],
    correctIdx: 2,
    explanation: "Priority scheduling can starve low-priority processes indefinitely.",
  },
  {
    category: "technical",
    subTopic: "os",
    difficulty: "medium",
    prompt: "Deadlock requires all of the following EXCEPT?",
    options: [
      "Mutual exclusion",
      "Hold and wait",
      "Preemption",
      "Circular wait",
    ],
    correctIdx: 2,
    explanation:
      "Coffman conditions: mutual exclusion, hold & wait, no preemption, circular wait.",
  },
  {
    category: "technical",
    subTopic: "networks",
    difficulty: "medium",
    prompt: "Which layer of OSI does TCP belong to?",
    options: ["Network", "Transport", "Session", "Data link"],
    correctIdx: 1,
    explanation: "TCP/UDP are Layer 4 (Transport).",
  },
  {
    category: "technical",
    subTopic: "dbms",
    difficulty: "medium",
    prompt: "Which normal form removes transitive dependencies?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correctIdx: 2,
    explanation: "3NF removes transitive dependencies; BCNF further tightens.",
  },
  {
    category: "technical",
    subTopic: "dbms",
    difficulty: "hard",
    prompt: "Index on a column speeds up which operations?",
    options: [
      "Reads only",
      "Writes only",
      "Reads; writes get slightly slower",
      "Neither",
    ],
    correctIdx: 2,
    explanation: "Indexes speed up reads (and updates when WHERE matches) but add write cost.",
  },
  {
    category: "technical",
    subTopic: "algorithms",
    difficulty: "medium",
    prompt: "Worst-case complexity of QuickSort?",
    options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"],
    correctIdx: 1,
    explanation: "Worst case on already-sorted / all-equal with bad pivot = O(n²).",
  },
  {
    category: "technical",
    subTopic: "algorithms",
    difficulty: "medium",
    prompt: "Dijkstra fails on graphs with?",
    options: [
      "Negative weights",
      "Cycles",
      "Disconnected nodes",
      "Undirected edges",
    ],
    correctIdx: 0,
    explanation: "Dijkstra assumes non-negative edge weights.",
  },
  {
    category: "technical",
    subTopic: "oop",
    difficulty: "easy",
    prompt: "Encapsulation in OOP means?",
    options: [
      "Hiding implementation details behind an interface",
      "Inheriting from a parent class",
      "Same name, different behavior",
      "Creating one instance",
    ],
    correctIdx: 0,
    explanation: "Encapsulation = bundling data + methods, controlling access.",
  },
  {
    category: "technical",
    subTopic: "javascript",
    difficulty: "medium",
    prompt: "Output of: console.log(typeof null)?",
    options: ["'null'", "'object'", "'undefined'", "'boolean'"],
    correctIdx: 1,
    explanation: "Famous JS quirk — typeof null === 'object'.",
  },
  {
    category: "technical",
    subTopic: "system-design",
    difficulty: "hard",
    prompt: "Which is NOT a valid cache eviction policy?",
    options: ["LRU", "LFU", "FIFO", "MRU-None"],
    correctIdx: 3,
    explanation: "LRU, LFU, FIFO are all real. MRU-None is made up.",
  },

  // ===== HR / BEHAVIORAL =====
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "medium",
    prompt:
      "'Tell me about a time you disagreed with a teammate.' What does the interviewer most want?",
    options: [
      "That you were right",
      "A clear STAR-formatted story showing resolution",
      "A blame story",
      "A hypothetical",
    ],
    correctIdx: 1,
    explanation: "Use STAR (Situation/Task/Action/Result). Show maturity and outcome.",
  },
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "easy",
    prompt: "Best answer to 'What is your biggest weakness?'",
    options: [
      "'I'm a perfectionist'",
      "'I don't have any'",
      "A real weakness with steps you're taking to improve",
      "Lie convincingly",
    ],
    correctIdx: 2,
    explanation: "Show self-awareness + growth mindset. Avoid clichés.",
  },
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "medium",
    prompt: "Why are you leaving your current role? (Best framing)",
    options: [
      "Blaming the manager",
      "Citing compensation only",
      "Growth, learning, alignment with next step",
      "Venting",
    ],
    correctIdx: 2,
    explanation: "Forward-looking, not bitter. Show what you're moving toward.",
  },
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "hard",
    prompt:
      "When asked 'Where do you see yourself in 5 years?', the strongest signal is:",
    options: [
      "A specific job title",
      "Skills you want to build and impact you want to have",
      "'I want your job'",
      "Money number",
    ],
    correctIdx: 1,
    explanation:
      "Companies want trajectory and growth that aligns with the role's path.",
  },

  // ===== COMPANY-SPECIFIC — GOOGLE =====
  {
    category: "technical",
    subTopic: "graphs",
    difficulty: "hard",
    prompt:
      "Given a directed graph, return true if there is a cycle. Best general approach?",
    options: [
      "BFS from every node",
      "Topological sort (Kahn's) — if sorted count < n, there's a cycle",
      "Binary search",
      "Dijkstra from every node",
    ],
    correctIdx: 1,
    explanation:
      "Kahn's algo detects cycles via in-degree bookkeeping. Classic Google round-2 question.",
    company: "google",
    role: "Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(45),
    timesReported: 7,
    source: "LeetCode discuss",
  },
  {
    category: "technical",
    subTopic: "arrays",
    difficulty: "medium",
    prompt:
      "Find the longest subarray with sum ≤ K for a non-negative integer array.",
    options: [
      "Nested loops — O(n²)",
      "Sliding window — O(n)",
      "DP — O(n²) memory",
      "Binary indexed tree — O(n log n)",
    ],
    correctIdx: 1,
    explanation: "Sliding window works because all values are non-negative.",
    company: "google",
    role: "Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(20),
    timesReported: 5,
    source: "Glassdoor",
  },
  {
    category: "technical",
    subTopic: "dp",
    difficulty: "hard",
    prompt:
      "Number of ways to climb N stairs taking 1 or 2 steps. What's the best follow-up Google asks?",
    options: [
      "Memoize vs tabulate space usage",
      "Extension to K steps (matrix exponentiation)",
      "Print all sequences",
      "Recursive only",
    ],
    correctIdx: 1,
    explanation:
      "After the warmup, Google often pushes toward O(log n) via matrix exp for K steps.",
    company: "google",
    role: "Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(60),
    timesReported: 4,
    source: "Reddit r/cscareerquestions",
  },
  {
    category: "technical",
    subTopic: "system-design",
    difficulty: "hard",
    prompt:
      "Design a URL shortener. The single most important follow-up Google asks is:",
    options: [
      "Pick a font",
      "Custom short-code generation with collision handling (base62 + retry)",
      "Logo design",
      "Color of buttons",
    ],
    correctIdx: 1,
    explanation:
      "Interviewers want to see how you handle collisions, ID generation, and DB lookups.",
    company: "google",
    role: "Senior Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(30),
    timesReported: 9,
    source: "Glassdoor",
  },
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "In transformer attention, why do we scale by sqrt(d_k)?",
    options: [
      "To make numbers smaller",
      "To keep dot-product variance stable so softmax isn't saturated",
      "Faster matmul",
      "Saves memory",
    ],
    correctIdx: 1,
    explanation:
      "Scaled dot-product attention normalizes variance of QKᵀ to avoid vanishing gradients in softmax. Core research interview topic.",
    company: "google",
    role: "Research Intern",
    askedYear: 2025,
    lastReported: daysAgo(15),
    timesReported: 6,
    source: "Candidates via Twitter/X",
  },
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "What's the difference between LayerNorm and BatchNorm for training stability?",
    options: [
      "They are the same",
      "LayerNorm normalizes across features (per sample); BatchNorm across batch (per feature) — LayerNorm is independent of batch size and preferred for transformers",
      "BatchNorm is always better",
      "LayerNorm is for images only",
    ],
    correctIdx: 1,
    explanation:
      "LayerNorm is per-token, batch-size agnostic. Standard in transformer blocks.",
    company: "google",
    role: "Research Intern",
    askedYear: 2025,
    lastReported: daysAgo(50),
    timesReported: 4,
    source: "InterviewBit reports",
  },
  {
    category: "technical",
    subTopic: "strings",
    difficulty: "medium",
    prompt:
      "Longest substring without repeating characters. Best Google variant follow-up?",
    options: [
      "Re-do same problem",
      "Return all such substrings",
      "Longest substring with at most K distinct characters",
      "Use recursion",
    ],
    correctIdx: 2,
    explanation: "Classic Google twist — same sliding window, different constraint.",
    company: "google",
    role: "Software Engineer",
    askedYear: 2024,
    lastReported: daysAgo(180),
    timesReported: 3,
    source: "LeetCode discuss",
  },
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "Explain backprop through a softmax + cross-entropy layer. The gradient simplifies to:",
    options: [
      "p - y",
      "y - p",
      "p(1-p)",
      "log(p)",
    ],
    correctIdx: 1,
    explanation: "dL/dz = softmax(z) - y = p - y. Knowing the clean form signals research readiness.",
    company: "google",
    role: "Research Intern",
    askedYear: 2024,
    lastReported: daysAgo(220),
    timesReported: 5,
    source: "Candidates on Blind",
  },

  // ===== COMPANY-SPECIFIC — MICROSOFT =====
  {
    category: "technical",
    subTopic: "linked-list",
    difficulty: "medium",
    prompt:
      "Reverse a linked list iteratively. What's Microsoft's most common follow-up?",
    options: [
      "Reverse in groups of K",
      "Print it",
      "Sort it",
      "Convert to array",
    ],
    correctIdx: 0,
    explanation: "Reverse in groups of K is the staple Microsoft round-2 twist.",
    company: "microsoft",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(35),
    timesReported: 6,
    source: "LeetCode discuss",
  },
  {
    category: "technical",
    subTopic: "trees",
    difficulty: "medium",
    prompt: "Validate a Binary Search Tree. Best O(n) approach?",
    options: [
      "Check each node locally",
      "In-order traversal tracking previous value (must be strictly increasing)",
      "BFS level order",
      "Hash the tree",
    ],
    correctIdx: 1,
    explanation: "In-order traversal of a BST yields sorted order; track prev.",
    company: "microsoft",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(70),
    timesReported: 4,
    source: "Glassdoor",
  },
  {
    category: "technical",
    subTopic: "dp",
    difficulty: "medium",
    prompt: "Word Break problem. Most common Microsoft follow-up?",
    options: [
      "Output all sentences",
      "Memoize the result",
      "Both A and B",
      "Use brute force",
    ],
    correctIdx: 2,
    explanation: "Microsoft expects BOTH: memoization AND reconstruction of all sentences.",
    company: "microsoft",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(90),
    timesReported: 3,
    source: "Candidates on Reddit",
  },
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "medium",
    prompt: "Microsoft's culture question: 'What does 'growth mindset' mean to you?'",
    options: [
      "Promote yourself fast",
      "Embrace challenges, learn from feedback, see effort as a path to mastery",
      "Beat the competition",
      "Work overtime",
    ],
    correctIdx: 1,
    explanation: "Microsoft explicitly evaluates Growth Mindset — be specific with a story.",
    company: "microsoft",
    role: "PM",
    askedYear: 2025,
    lastReported: daysAgo(40),
    timesReported: 8,
    source: "Microsoft careers blog",
  },
  {
    category: "technical",
    subTopic: "system-design",
    difficulty: "hard",
    prompt: "Design a chat system (Teams-like). Microsoft most-cares about:",
    options: [
      "Logo",
      "Real-time delivery (WebSockets/SignalR), presence, message ordering, scaling fan-out",
      "Font choice",
      "Sidebar color",
    ],
    correctIdx: 1,
    explanation:
      "Real-time, presence, and read-receipts at scale are the test of the design.",
    company: "microsoft",
    role: "Senior SDE",
    askedYear: 2025,
    lastReported: daysAgo(25),
    timesReported: 5,
    source: "LeetCode discuss",
  },

  // ===== COMPANY-SPECIFIC — AMAZON =====
  {
    category: "technical",
    subTopic: "behavioral",
    difficulty: "hard",
    prompt: "Amazon's 'Customer Obsession' behavioral — best STAR answer should focus on:",
    options: [
      "Internal metrics",
      "A specific customer outcome you improved, with the data",
      "Beating a competitor",
      "A team process",
    ],
    correctIdx: 1,
    explanation:
      "Customer Obsession = start from customer, work backward, include the result they felt.",
    company: "amazon",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(10),
    timesReported: 11,
    source: "Amazon leadership principles",
  },
  {
    category: "technical",
    subTopic: "arrays",
    difficulty: "easy",
    prompt: "Two Sum. Amazon's most-asked twist?",
    options: [
      "Re-do same problem",
      "Three Sum / 3Sum Closest",
      "Sort the array",
      "Use recursion",
    ],
    correctIdx: 1,
    explanation: "Once you solve Two Sum, expect 3Sum as the immediate extension.",
    company: "amazon",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(20),
    timesReported: 14,
    source: "LeetCode top Amazon tag",
  },
  {
    category: "technical",
    subTopic: "system-design",
    difficulty: "hard",
    prompt: "Design Amazon's product search ranking. Most important:",
    options: [
      "Color of the page",
      "Inverted index + ranking (BM25/TF-IDF) + personalization signals + A/B ranking layer",
      "Hardcoded list",
      "Random",
    ],
    correctIdx: 1,
    explanation:
      "Expect discussion of indexing, ranking models, learning-to-rank, A/B evaluation.",
    company: "amazon",
    role: "Senior SDE",
    askedYear: 2025,
    lastReported: daysAgo(55),
    timesReported: 7,
    source: "Glassdoor",
  },
  {
    category: "technical",
    subTopic: "dp",
    difficulty: "medium",
    prompt: "Longest Palindromic Substring. Amazon follow-up?",
    options: [
      "Print the string",
      "Count palindromes",
      "Longest Palindromic Subsequence (DP-based)",
      "Recursion only",
    ],
    correctIdx: 2,
    explanation:
      "Substring = expand-around-center; subsequence = DP table. Common Amazon twist.",
    company: "amazon",
    role: "SDE",
    askedYear: 2025,
    lastReported: daysAgo(120),
    timesReported: 3,
    source: "Reddit r/cscareerquestions",
  },

  // ===== COMPANY-SPECIFIC — META =====
  {
    category: "technical",
    subTopic: "graphs",
    difficulty: "medium",
    prompt: "Number of Islands. Meta's follow-up?",
    options: [
      "Print the grid",
      "Number of distinct islands (shape-hash)",
      "Use recursion only",
      "Sort the grid",
    ],
    correctIdx: 1,
    explanation:
      "Number of DISTINCT islands (by canonical shape) is a Meta round-3 favorite.",
    company: "meta",
    role: "Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(18),
    timesReported: 6,
    source: "LeetCode discuss",
  },
  {
    category: "technical",
    subTopic: "system-design",
    difficulty: "hard",
    prompt: "Design Instagram feed. Meta cares most about:",
    options: [
      "Filter color",
      "Fan-out (push vs pull), ranking model, caching, eventual consistency",
      "Logo",
      "Typography",
    ],
    correctIdx: 1,
    explanation:
      "Push vs pull fan-out tradeoffs and the ranking layer are the real test.",
    company: "meta",
    role: "E4 Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(40),
    timesReported: 8,
    source: "Meta engineering blog",
  },
  {
    category: "hr",
    subTopic: "behavioral",
    difficulty: "hard",
    prompt: "Meta's 'Move Fast' principle is best demonstrated by:",
    options: [
      "Skipping tests",
      "Shipping iteratively, learning from real users, with safety rails",
      "Long planning",
      "Avoiding risk",
    ],
    correctIdx: 1,
    explanation:
      "Show how you shipped something small, learned, and iterated — with safeguards.",
    company: "meta",
    role: "Software Engineer",
    askedYear: 2025,
    lastReported: daysAgo(28),
    timesReported: 4,
    source: "Candidates on Blind",
  },
  {
    category: "technical",
    subTopic: "dp",
    difficulty: "hard",
    prompt: "Edit Distance. Meta's typical follow-up?",
    options: [
      "Print path",
      "One Edit Distance (LeetCode 161) — single edit check",
      "Re-do same problem",
      "Use recursion",
    ],
    correctIdx: 1,
    explanation: "One Edit Distance is a common Meta phone-screen follow-up.",
    company: "meta",
    role: "Software Engineer",
    askedYear: 2024,
    lastReported: daysAgo(200),
    timesReported: 3,
    source: "LeetCode discuss",
  },

  // ===== COMPANY-SPECIFIC — NVIDIA =====
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "Why do we prefer mixed-precision training (fp16/bf16) over fp32 in modern LLMs?",
    options: [
      "Cheaper memory & faster matmul on Tensor Cores; loss scaling prevents underflow",
      "No reason",
      "Less accurate so better generalization",
      "Saves disk only",
    ],
    correctIdx: 0,
    explanation:
      "Tensor Cores accelerate bf16/fp16 throughput; loss scaling avoids gradient underflow.",
    company: "nvidia",
    role: "AI Research Intern",
    askedYear: 2025,
    lastReported: daysAgo(8),
    timesReported: 9,
    source: "NVIDIA Developer blog",
  },
  {
    category: "technical",
    subTopic: "cuda",
    difficulty: "hard",
    prompt:
      "What is a CUDA warp, and what is the size?",
    options: [
      "A thread group of 32, executes in lockstep (SIMT)",
      "A CPU core",
      "A memory block",
      "A scheduling queue",
    ],
    correctIdx: 0,
    explanation: "A warp = 32 threads executed in SIMT fashion. Critical for occupancy.",
    company: "nvidia",
    role: "CUDA Engineer Intern",
    askedYear: 2025,
    lastReported: daysAgo(33),
    timesReported: 5,
    source: "NVIDIA CUDA docs",
  },
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "When training is unstable with bf16, what's the first thing to try?",
    options: [
      "Switch back to fp32 always",
      "Add loss scaling; check for NaN gradients; reduce LR",
      "Increase batch size",
      "Disable dropout",
    ],
    correctIdx: 1,
    explanation:
      "bf16 has the same exponent range as fp32 (no scaling needed for underflow), but gradient NaN can still occur — gradient clipping and lower LR help.",
    company: "nvidia",
    role: "AI Research Intern",
    askedYear: 2025,
    lastReported: daysAgo(60),
    timesReported: 4,
    source: "Candidates via LinkedIn",
  },
  {
    category: "technical",
    subTopic: "research-ml",
    difficulty: "hard",
    prompt:
      "FlashAttention's main contribution is:",
    options: [
      "A new GPU",
      "Tiling to avoid materializing the full N×N attention matrix — IO-aware",
      "A new loss function",
      "Better tokenization",
    ],
    correctIdx: 1,
    explanation:
      "FlashAttention reduces HBM reads/writes by computing attention in tiles — large speedup + memory reduction.",
    company: "nvidia",
    role: "AI Research Intern",
    askedYear: 2024,
    lastReported: daysAgo(240),
    timesReported: 3,
    source: "Tri Dao paper",
  },
  {
    category: "technical",
    subTopic: "cuda",
    difficulty: "medium",
    prompt: "Coalesced memory access in CUDA means:",
    options: [
      "Threads in a warp access contiguous memory addresses",
      "Threads access random addresses",
      "Single thread loads many bytes",
      "No relation to performance",
    ],
    correctIdx: 0,
    explanation:
      "Coalesced = warp threads access 32 consecutive 4-byte words in one transaction — maximizes bandwidth.",
    company: "nvidia",
    role: "CUDA Engineer Intern",
    askedYear: 2024,
    lastReported: daysAgo(300),
    timesReported: 4,
    source: "CUDA C++ Best Practices Guide",
  },
];

async function main() {
  console.log("Seeding database…");
  // wipe
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  for (const q of QUESTIONS) {
    await prisma.question.create({
      data: {
        category: q.category,
        subTopic: q.subTopic,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        correctIdx: q.correctIdx,
        explanation: q.explanation,
        company: q.company ?? null,
        role: q.role ?? null,
        askedYear: q.askedYear ?? null,
        lastReported: q.lastReported ?? null,
        timesReported: q.timesReported ?? 1,
        source: q.source ?? null,
      },
    });
  }
  console.log(`Seeded ${QUESTIONS.length} questions.`);

  const counts = await prisma.question.groupBy({
    by: ["company"],
    where: { company: { not: null } },
    _count: true,
  });
  console.log("Per-company counts:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
