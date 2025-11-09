        // --- Firebase Imports ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- Global Firebase Configuration Variables (MANDATORY) ---
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'finworld-default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        const geminiApiKey = ""; // API key is left empty for Canvas runtime injection
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

        // --- Global State ---
        let db, auth;
        let state = {
            isAuthReady: false,
            userId: null,
            userData: null,
            isLoading: true,
            isLoggedIn: false, // Mock login status
            activeView: 'dashboard',
            showChatModal: false,
            message: null,
            receiptDetails: null,
            // For LLM Insight Card
            insight: null,
            isInsightLoading: false,
            isSavingReceipt: false,
            movieSearchTerm: '',
        };

        // --- Mock initial data structure for new users ---
        const initialUserData = {
            name: "Minh",
            dob: "XX/XX/2000",
            creditScore: "A-",
            accounts: [
                { id: 'CHK-1234', name: 'Main Account & Debit Visa Card', balance: 10000000.00, currency: 'USD', icon: 'CreditCard', type: 'primary' },
                { 
                    id: 'SAV-5678', 
                    name: 'High-Yield Savings', 
                    balance: 50000.00, 
                    currency: 'USD', 
                    icon: 'PiggyBank',
                    interestRate: '3% per year',
                    depositDate: '2024-10-01T00:00:00.000Z',
                    type: 'savings'
                },
                { id: 'CRD-9012', name: 'FINworld Credit (Debt)', balance: -30000.00, currency: 'USD', icon: 'CreditCard', type: 'credit' },
            ],
            transactions: [
                { id: Date.now() + 1, date: new Date(Date.now() - 360000000).toISOString(), description: "Initial Deposit (Mock Balance)", amount: 10050000.00, type: 'Credit', accountId: 'CHK-1234' },
                { id: Date.now() + 2, date: new Date(Date.now() - 180000000).toISOString(), description: "Credit Utilization / Line of Credit", amount: 30000.00, type: 'Credit', accountId: 'CRD-9012' },
                { id: Date.now() + 3, date: new Date(Date.now() - 86400000).toISOString(), description: "Coffee Shop Purchase", amount: -4.50, type: 'Debit', accountId: 'CHK-1234' },
            ],
            last_login: new Date().toISOString(),
            savedReceipts: [], 
        };

        function createInitialUserData() {
            const data = JSON.parse(JSON.stringify(initialUserData));
            data.last_login = new Date().toISOString();
            return data;
        }

        // --- State Management ---
        function setState(newState) {
            state = { ...state, ...newState };
            renderApp();
            if (typeof renderModals === 'function') {
                renderModals();
            }
        }

        async function initializeFirebase() {
            if (Object.keys(firebaseConfig).length === 0) {
                 console.error("Firebase config is missing or empty.");
                 setState({ isAuthReady: true });
                 return;
            }

            try {
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);

                const setupAuth = async () => {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth); 
                    }
                };

                onAuthStateChanged(auth, (currentUser) => {
                    setState({ userId: currentUser?.uid || null, isAuthReady: true });
                });

                await setupAuth();
            } catch (error) {
                console.error("Firebase Initialization/Auth Error:", error);
                setState({ isAuthReady: true });
            }
        }

        // --- Firestore Data Handling ---

        function getUserDocPath() {
            return state.userId && db
                ? doc(db, 'artifacts', appId, 'users', state.userId, 'finworld_data', 'user_profile')
                : null;
        }

        async function fetchUserData() {
            const docPath = getUserDocPath();
            if (!docPath) return;

            setState({ isLoading: true });
            try {
                const docSnap = await getDoc(docPath);
                if (docSnap.exists()) {
                    setState({ userData: docSnap.data(), isLoading: false });
                } else {
                    // Initialize data for a new user
                    await setDoc(docPath, initialUserData);
                    setState({ userData: initialUserData, isLoading: false });
                }
            } catch (error) {
                console.error("Error fetching/initializing user data:", error);
                setState({ isLoading: false });
            }
        }

        function setupDataListener() {
            const docPath = getUserDocPath();
            if (!state.isAuthReady || !docPath || !state.isLoggedIn) return;

            // Stop any previous listener
            if (state.unsubscribeSnapshot) state.unsubscribeSnapshot();

            const unsubscribe = onSnapshot(docPath, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setState({ userData: docSnapshot.data(), isLoading: false });
                } else {
                    fetchUserData(); // If doc disappears, try to re-initialize
                }
            }, (error) => {
                console.error("Firestore onSnapshot Error:", error);
                setState({ isLoading: false });
            });

            setState({ unsubscribeSnapshot: unsubscribe });
        }


        // --- Utility Functions ---

        function formatCurrency(amount, currency = 'USD') {
            const formattedAmount = Math.abs(amount); 
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
            }).format(formattedAmount);
        }

        function createIcon(iconName, classes = 'w-5 h-5') {
            return `<i data-lucide="${iconName}" class="${classes}"></i>`;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        // Converts markdown lists to HTML (simplified for this context)
        function renderMarkdown(markdown) {
            if (!markdown) return '';
            let html = markdown;
            // Simple conversion for bullet points
            html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
            
            if (html.includes('<li>')) {
                 html = `<ul>${html}</ul>`;
            }

            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
            
            // Convert newlines to paragraphs (only if no list was found)
            if (!html.startsWith('<ul>')) {
                html = html.split('\n').map(p => p.trim()).filter(p => p.length > 0).map(p => `<p class="mb-2 last:mb-0">${p}</p>`).join('');
            }
            return html;
        }

        function showMessage(type, text) {
             const messageBox = document.getElementById('message-box');
             if (!messageBox) return;

             const bgColor = type === 'error' ? 'bg-red-100' : 'bg-emerald-100';
             const textColor = type === 'error' ? 'text-red-700' : 'text-emerald-700';
             const icon = type === 'error' ? 'X' : 'Check';

             messageBox.innerHTML = `
                <div class="${bgColor} ${textColor} p-3 rounded-xl text-sm mb-4 flex items-center shadow-md">
                    ${createIcon(icon, 'w-5 h-5 mr-2')}
                    <span>${text}</span>
                </div>
             `;
             setTimeout(() => messageBox.innerHTML = '', 5000);
        }

        // --- LLM Logic (Gemini API) ---

        async function callGeminiForInsight() {
            if (state.isInsightLoading || !state.userId) return;

            if (!geminiApiKey) {
                setState({ insight: "AI insights are unavailable in this offline demo. 🚀" });
                return;
            }

            const initialBalance = 50000.00;
            const apy = 0.03;
            const projectionYears = 1;
            const simpleInterest = initialBalance * apy * projectionYears;
            const futureValue = initialBalance + simpleInterest;

            const prompt = `Your user has a savings account with a current balance of ${formatCurrency(initialBalance)} and a ${apy * 100}% APY. If they hold this for one more year, the projected simple interest is ${formatCurrency(simpleInterest)}, making the future value ${formatCurrency(futureValue)}. Based on this, act as a friendly and encouraging financial coach. Provide a concise, motivational paragraph (no headers or bullets) about their progress. After the paragraph, provide three highly actionable, personalized tips using markdown bullet points to help them boost their total savings balance by 15% over the next year.`;
            
            const systemPrompt = "You are FINworld Financial Coach, a friendly, data-driven, and highly motivational financial assistant. Your response must be in plain, natural language and adhere strictly to the requested format (one paragraph summary followed by three markdown bullet points).";

            setState({ isInsightLoading: true, insight: null });

            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
            };

            const maxRetries = 3;
            const baseDelay = 1000;
            let insightText = "I'm having trouble connecting to the financial insight service. Please try again later. 😔";

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(geminiApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        if (response.status === 429 && i < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, baseDelay * (2 ** i)));
                            continue; 
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    insightText = result.candidates?.[0]?.content?.parts?.[0]?.text || insightText;
                    break; 

                } catch (error) {
                    console.error("Gemini Insight API Error:", error);
                }
            }
            setState({ isInsightLoading: false, insight: insightText });
            // Re-render icons if needed after insertion
            createIcons({ icons });
        }


        // --- View Rendering Functions ---

        function renderLoader() {
            return `
                <div class="flex justify-center items-center h-96">
                    <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-indigo-500"></i>
                    <p class="ml-3 text-lg text-gray-600">Loading FINworld data...</p>
                </div>
            `;
        }

        function renderAccountCard(account) {
            const IconName = account.icon || 'CreditCard';
            const balanceColor = account.id === 'CRD-9012' ? 'text-blue-500' : (account.balance < 0 ? 'text-red-500' : 'text-emerald-500');
            const formattedBalance = formatCurrency(account.balance, account.currency);
            
            return `
                <div class="bg-white p-6 shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition duration-300">
                    <div class="flex items-center justify-between">
                        <div class="p-3 rounded-full bg-indigo-50 text-indigo-600">
                            ${createIcon(IconName, 'w-6 h-6')}
                        </div>
                        <span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            ${account.id}
                        </span>
                    </div>
                    <h3 class="mt-4 text-lg font-semibold text-gray-800">${account.name}</h3>
                    ${account.type === 'primary' ? 
                        `<p class="text-xs font-semibold text-indigo-500 mt-1 mb-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-full">Primary Account</p>` : ''
                    }
                    <div class="mt-2">
                        <p class="text-xl font-bold tracking-tight">
                            <span class="${balanceColor}">${formattedBalance}</span>
                        </p>
                        <p class="text-sm text-gray-500">${account.id === 'CRD-9012' ? 'Current Debt' : 'Current Balance'}</p>
                    </div>
                    ${account.interestRate ? 
                        `<p class="text-xs text-indigo-400 mt-2">${account.interestRate} APY 📈</p>` : ''
                    }
                </div>
            `;
        }

        function renderFinancialInsightCard(savingAccount) {
            const initialBalance = 50000.00;
            const apy = 0.03;
            const projectionYears = 1;
            const simpleInterest = initialBalance * apy * projectionYears;
            const futureValue = initialBalance + simpleInterest;

            const insightHtml = state.isInsightLoading ? 
                `
                <div class="flex flex-col items-center justify-center h-full py-6 text-indigo-600">
                    ${createIcon('loader-2', 'w-6 h-6 animate-spin mb-2')}
                    <p>Generating personalized advice...</p>
                </div>
                ` : (state.insight ? renderMarkdown(state.insight) :
                `<p class="text-red-500 text-sm">Could not load insights. Click Refresh Insight.</p>`
            );

            return `
                <div class="bg-indigo-50 p-6 shadow-xl rounded-2xl border border-indigo-200">
                    <h2 class="text-2xl font-bold text-indigo-800 mb-4 flex items-center">
                        ${createIcon('zap', 'w-6 h-6 mr-2 text-indigo-500')} Financial Coach Insight ✨
                    </h2>

                    <div class="flex justify-between items-center mb-4 p-3 bg-indigo-100 rounded-lg">
                        <div>
                            <p class="text-sm font-medium text-indigo-600">Savings Projection (Next Year)</p>
                            <p class="text-3xl font-extrabold text-indigo-900 tracking-tight mt-1">
                                ${formatCurrency(futureValue)}
                            </p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-indigo-600">Projected Interest</p>
                            <p class="text-xl font-bold text-indigo-700 mt-0.5">
                                +${formatCurrency(simpleInterest)}
                            </p>
                        </div>
                    </div>

                    <div id="insight-content" class="min-h-[150px] text-gray-700 text-sm">
                        ${insightHtml}
                    </div>

                    <button 
                        id="refreshInsightButton"
                        onclick="window.callGeminiForInsight()"
                        ${state.isInsightLoading ? 'disabled' : ''}
                        class="mt-4 w-full py-2 px-4 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-200 hover:bg-indigo-300 transition duration-150 disabled:opacity-50 flex items-center justify-center"
                    >
                        ${state.isInsightLoading ? `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Re-analyzing...` : `<i data-lucide="trending-up" class="w-4 h-4 mr-2"></i> Refresh Insight`}
                    </button>
                </div>
            `;
        }
        
        function renderTransactionItem(tx) {
            const date = new Date(tx.date).toLocaleDateString();
            const time = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const isCredit = tx.type === 'Credit'; 
            const amountColor = isCredit ? 'text-emerald-600' : 'text-red-600';
            const sign = isCredit ? '+' : '';
            const Icon = isCredit ? 'DollarSign' : 'Send';

            return `
                <li class="flex items-center justify-between py-4 border-b last:border-b-0">
                    <div class="flex items-center space-x-4">
                        <div class="p-2 rounded-full ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
                            ${createIcon(Icon, 'w-5 h-5')}
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${tx.description}</p>
                            <p class="text-xs text-gray-500 mt-0.5">${date} at ${time}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-base font-semibold ${amountColor}">
                            ${sign}${formatCurrency(tx.amount, 'USD')}
                        </p>
                        <p class="text-xs text-gray-400">
                            ${tx.accountId}
                        </p>
                    </div>
                </li>
            `;
        }

        function renderDashboard() {
            const accountsHtml = state.userData.accounts.map(renderAccountCard).join('');
            const savingAccount = state.userData.accounts.find(acc => acc.id === 'SAV-5678');
            const insightCardHtml = savingAccount ? renderFinancialInsightCard(savingAccount) : '';
            
            const sortedTransactions = [...state.userData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentTransactions = sortedTransactions.slice(0, 5).map(renderTransactionItem).join('');

            return `
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${accountsHtml}
                        ${insightCardHtml}
                    </div>
                    <div class="mt-8">
                        <h3 class="text-xl font-semibold text-gray-800 mb-3">Recent Activity</h3>
                        <div class="bg-white p-6 shadow-xl rounded-2xl border border-gray-100">
                            ${recentTransactions.length > 0 ? 
                                `<ul class="divide-y divide-gray-100">${recentTransactions}</ul>
                                <button onclick="window.setState({ activeView: 'history' })" class="mt-4 text-indigo-600 font-medium hover:text-indigo-800 transition duration-150">
                                    View All Transactions &rarr;
                                </button>
                                ` : 
                                `<p class="text-gray-500">No recent activity. Everything looks quiet here. 🧘</p>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }

        function renderHistory() {
            const sortedTransactions = [...state.userData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            const historyHtml = sortedTransactions.map(renderTransactionItem).join('');

            return `
                <div class="bg-white p-6 shadow-xl rounded-2xl border border-gray-100">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        ${createIcon('history', 'w-5 h-5 mr-2')} Transaction History 📜
                    </h2>
                    ${historyHtml.length > 0 ? 
                        `<ul class="divide-y divide-gray-100">${historyHtml}</ul>` : 
                        `<p class="text-gray-500">No transactions recorded yet. Start spending! 😉</p>`
                    }
                </div>
            `;
        }

        function renderTransfer() {
            const accounts = state.userData.accounts;
            const defaultSourceId = accounts[0]?.id || '';
            const otherAccounts = accounts.filter(acc => acc.id !== defaultSourceId);

            return `
                <div class="bg-white p-6 shadow-xl rounded-2xl border border-gray-100">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <div>${createIcon('send', 'w-5 h-5 mr-2 inline-block')} Send Money 💸</div>
                        <button 
                            id="toggleQRScanButton"
                            onclick="document.getElementById('qr-scan-section').classList.toggle('hidden')"
                            class="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                        >
                            Scan QR Code 📸
                        </button>
                    </h2>
                    <div id="message-box"></div>
                    
                    <div id="qr-scan-section" class="hidden text-center p-8 border border-dashed border-gray-300 rounded-xl bg-gray-50 mb-4">
                        <img 
                            src="https://placehold.co/150x150/5B36E0/ffffff?text=Mock+QR+Scan" 
                            alt="Mock QR Code Scan" 
                            class="mx-auto mb-4 rounded-lg"
                        />
                        <p class="text-gray-600">
                            Simulating QR Scan: The recipient ID from the QR code would populate the recipient field below. 
                        </p>
                    </div>

                    <form id="transferForm" class="space-y-4">
                        <div>
                            <label htmlFor="source" class="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                            <select
                                id="sourceAccount"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                ${accounts.map(acc => `
                                    <option value="${acc.id}" ${acc.id === defaultSourceId ? 'selected' : ''}>
                                        ${acc.name} (${formatCurrency(acc.balance)})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="destinationType" class="block text-sm font-medium text-gray-700 mb-1">To Account/Recipient Type</label>
                            <select
                                id="destinationType"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                onchange="window.handleDestinationChange(this.value)"
                                required
                            >
                                <option value="EXTERNAL">External Recipient ID</option>
                                ${otherAccounts.map(acc => `
                                    <option value="${acc.id}">
                                        Internal: ${acc.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div id="externalRecipientField">
                            <label htmlFor="externalRecipient" class="block text-sm font-medium text-gray-700 mb-1">External Recipient Account ID</label>
                            <input
                                id="externalRecipient"
                                type="text"
                                placeholder="e.g., 9876543210"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="amount" class="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                            <input
                                id="transferAmount"
                                type="number"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            id="transferSubmitButton"
                            class="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150"
                        >
                            ${createIcon('send', 'w-5 h-5 mr-2')} Complete Transfer
                        </button>
                    </form>
                </div>
            `;
        }

        window.handleDestinationChange = function(value) {
            const externalField = document.getElementById('externalRecipientField');
            const externalInput = document.getElementById('externalRecipient');
            if (!externalField || !externalInput) return;

            if (value === 'EXTERNAL') {
                externalField.classList.remove('hidden');
                externalInput.required = true;
            } else {
                externalField.classList.add('hidden');
                externalInput.required = false;
            }
        }

        window.handleMovieSearchInput = function(value) {
            setState({ movieSearchTerm: value });
        }

        function renderProfile() {
            const userData = state.userData;
            const savingAccount = userData.accounts.find(acc => acc.id === 'SAV-5678');
            const creditAccount = userData.accounts.find(acc => acc.id === 'CRD-9012');
            const savedReceipts = userData.savedReceipts || [];
            
            const receiptsHtml = savedReceipts.length > 0 ?
                savedReceipts.map((r, index) => `
                    <div class="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                        <div class="flex justify-between items-center">
                            <p class="font-semibold text-emerald-800">Transfer of ${formatCurrency(r.amount)}</p>
                            <span class="text-xs font-mono text-gray-500">ID: ${r.confId}</span>
                        </div>
                        <p class="text-sm text-gray-600">To: ${r.recipient} | From: ${r.sourceId}</p>
                        <p class="text-xs text-gray-500">${new Date(r.timestamp).toLocaleString()}</p>
                    </div>
                `).join('') :
                `<p class="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No receipts saved yet. Try making a transfer!</p>`;

            return `
                <div class="bg-white p-8 shadow-xl rounded-2xl border border-gray-100">
                    <h2 class="text-3xl font-extrabold text-gray-800 mb-6 flex items-center">
                        ${createIcon('user', 'w-6 h-6 mr-3')} User Profile and Financial Overview
                    </h2>
                    <div id="message-box"></div>

                    <div class="space-y-6">
                        <!-- Personal Info -->
                        <div class="border-b pb-4">
                            <label class="block text-sm font-medium text-gray-500">Full Name</label>
                            <div id="nameDisplay" class="mt-1 flex justify-between items-center">
                                <p class="text-xl font-semibold text-gray-900">${userData.name}</p>
                                <button onclick="window.toggleNameEdit(true)" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                    Edit Name ✏️
                                </button>
                            </div>
                            <div id="nameEditForm" class="hidden mt-1 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <input type="text" id="nameInput" value="${userData.name}" class="flex-1 p-2 border border-indigo-300 rounded-lg focus:ring-indigo-500" />
                                <button onclick="window.handleNameSave()" id="saveNameButton" class="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                    Save
                                </button>
                                <button onclick="window.toggleNameEdit(false)" class="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 border-b pb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-500">Date of Birth</label>
                                <p class="mt-1 text-lg font-semibold text-gray-900">${userData.dob} 🎂</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-500">Credit Score</label>
                                <p class="mt-1 text-lg font-semibold text-blue-600">${userData.creditScore} ✨</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-500">Credit Debt</label>
                                <p class="mt-1 text-lg font-semibold text-red-600">${formatCurrency(creditAccount.balance)} 🔻</p>
                            </div>
                        </div>

                        <!-- Savings Information -->
                        ${savingAccount ? `
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div class="sm:col-span-3">
                                    <h3 class="text-lg font-bold text-indigo-800 flex items-center">
                                        ${createIcon('piggy-bank', 'w-5 h-5 mr-2')} Savings Details
                                    </h3>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-indigo-600">Interest Rate (APY)</label>
                                    <p class="mt-1 text-xl font-bold text-indigo-900">${savingAccount.interestRate} ⬆️</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-indigo-600">Initial Deposit Date</label>
                                    <p class="mt-1 text-base text-indigo-900">
                                        ${new Date(savingAccount.depositDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-indigo-600">Time with Bank</label>
                                    <p class="mt-1 text-base text-indigo-900">1 Year, 5 Days (as of 10/06/2025)</p>
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- Saved Receipts Section -->
                        <h3 class="text-xl font-bold text-gray-800 pt-4 border-t flex items-center">
                            ${createIcon('receipt', 'w-5 h-5 mr-2')} Saved Receipts (${savedReceipts.length})
                        </h3>
                        <div class="space-y-3">
                            ${receiptsHtml}
                        </div>

                        <!-- Unique IDs and QR Code -->
                        <h3 class="text-xl font-bold text-gray-800 pt-4 border-t flex items-center">
                            Shareable ID 🔗
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-500">Unique User ID (For transfers)</label>
                                <p class="mt-1 text-sm font-mono text-gray-900 break-all bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">${state.userId}</p>
                            </div>
                            <div class="md:col-span-1 flex flex-col items-center">
                                <label class="block text-sm font-medium text-gray-500 mb-2">My QR Code</label>
                                <img 
                                    src="https://placehold.co/100x100/364F6B/ffffff?text=${state.userId.substring(0, 4)}" 
                                    alt="QR Code for User ID" 
                                    class="rounded-lg shadow-md border"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            `;
        }
        
        // --- Core Movie Ticket Logic (User Request) ---
        
        function generateMovieSearchLink(baseUrl, queryParam) {
            const rawTerm = state.movieSearchTerm?.trim();
            if (!rawTerm) {
                return baseUrl;
            }

            const encodedSearchTerm = encodeURIComponent(rawTerm);

            // Determine correct way to append query
            const separator = baseUrl.includes('?') ? '&' : '?';

            // Special case for Galaxy: uses /tim-kiem?keyword=
            if (baseUrl.includes('/tim-kiem')) {
                 return `${baseUrl}?${queryParam}=${encodedSearchTerm}`;
            }

            return `${baseUrl}${separator}${queryParam}=${encodedSearchTerm}`;
        }

        window.searchMovie = function(cinema) {
            let url = '';
            let queryParam = '';

            switch (cinema) {
                case 'cgv':
                    url = 'https://www.cgv.vn/default/search/';
                    queryParam = 'q';
                    break;
                case 'cinestar':
                    url = 'https://cinestar.com.vn/default/search/';
                    queryParam = 'q';
                    break;
                case 'galaxy':
                    url = 'https://www.galaxycine.vn/tim-kiem';
                    queryParam = 'keyword';
                    break;
                default:
                    return;
            }

            const finalUrl = generateMovieSearchLink(url, queryParam);
            
            // Open the new URL in a new tab
            window.open(finalUrl, '_blank');
        }

        function renderServices() {
            const movieSearchTerm = state.movieSearchTerm || '';
            const safeMovieSearchTerm = escapeHtml(movieSearchTerm);
            const displaySearchTerm = safeMovieSearchTerm.trim() ? safeMovieSearchTerm : '...';

            return `
                <div class="bg-white p-6 shadow-xl rounded-2xl border border-gray-100">
                    <h2 class="text-3xl font-extrabold text-indigo-700 mb-6 flex items-center">
                        ${createIcon('zap', 'w-6 h-6 mr-3')} Quick Services & Booking 
                    </h2>
                    <p class="text-gray-600 mb-8">
                        Manage your finances and book your travel and entertainment all in one place.
                    </p>

                    <!-- Service Card Container (Responsive Grid) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

                        <!-- 1. Plane Tickets -->
                        <div class="bg-blue-50 p-5 rounded-xl shadow-lg border border-blue-200">
                            <h3 class="text-xl font-semibold text-blue-800 mb-3 flex items-center">
                                ${createIcon('plane', 'w-6 h-6 mr-2')} Plane Tickets
                            </h3>
                            <p class="text-sm text-blue-600 mb-3">Find the best deals for your next flight.</p>
                            <div class="space-y-3">
                                <input type="text" placeholder="Departure City" class="w-full p-2 border border-blue-300 rounded-lg focus:ring-blue-500 transition"/>
                                <input type="text" placeholder="Arrival City" class="w-full p-2 border border-blue-300 rounded-lg focus:ring-blue-500 transition"/>
                            </div>
                            <div class="mt-4 space-y-2">
                                <a href="https://www.trip.com/" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md">
                                    Search on Trip.com
                                </a>
                                <a href="https://www.traveloka.com/" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium">
                                    Search on Traveloka
                                </a>
                            </div>
                        </div>

                        <!-- 2. Bus Tickets -->
                        <div class="bg-green-50 p-5 rounded-xl shadow-lg border border-green-200">
                            <h3 class="text-xl font-semibold text-green-800 mb-3 flex items-center">
                                ${createIcon('bus', 'w-6 h-6 mr-2')} Bus Tickets
                            </h3>
                            <p class="text-sm text-green-600 mb-3">Book intercity or regional bus services.</p>
                            <div class="space-y-3">
                                <input type="text" placeholder="Start Location" class="w-full p-2 border border-green-300 rounded-lg focus:ring-green-500 transition"/>
                                <input type="date" placeholder="Date" class="w-full p-2 border border-green-300 rounded-lg focus:ring-green-500 transition"/>
                            </div>
                            <div class="mt-4 space-y-2">
                                <a href="https://www.agoda.com/" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md">
                                    Search on Agoda
                                </a>
                                <a href="https://www.trip.com/" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
                                    Search on Trip.com
                                </a>
                            </div>
                        </div>

                        <!-- 3. Movie Tickets (Dynamic Search) -->
                        <div class="bg-red-50 p-5 rounded-xl shadow-lg border border-red-200">
                            <h3 class="text-xl font-semibold text-red-800 mb-3 flex items-center">
                                ${createIcon('film', 'w-6 h-6 mr-2')} Movie Tickets
                            </h3>
                            <p class="text-sm text-red-600 mb-3">Search for movies in Vietnam's top cinemas.</p>
                            <div class="space-y-3">
                                <input 
                                    type="text" 
                                    id="movieSearchInput"
                                    placeholder="Enter Movie Title or City (e.g., Avatar 3)" 
                                    value="${safeMovieSearchTerm}"
                                    oninput="window.handleMovieSearchInput(this.value)"
                                    class="w-full p-2 border border-red-300 rounded-lg focus:ring-red-500 transition"
                                />
                                <div class="p-2 bg-red-100 rounded-lg text-xs text-red-700 font-medium">
                                    Searching for: <span id="currentSearchTerm" class="font-mono font-bold">${displaySearchTerm}</span>
                                </div>
                            </div>
                            <div class="mt-4 space-y-2">
                                <button
                                    onclick="window.searchMovie('cgv')"
                                    class="block w-full text-center py-2 px-4 bg-red-600 text-white rounded-lg transition font-medium shadow-md hover:bg-red-700"
                                >
                                    Search on CGV 🎬
                                </button>
                                <button
                                    onclick="window.searchMovie('cinestar')"
                                    class="block w-full text-center py-2 px-4 bg-red-500 text-white rounded-lg transition font-medium hover:bg-red-600"
                                >
                                    Search on Cinestar 🌟
                                </button>
                                <button
                                    onclick="window.searchMovie('galaxy')"
                                    class="block w-full text-center py-2 px-4 bg-red-400 text-white rounded-lg transition font-medium hover:bg-red-500"
                                >
                                    Search on Galaxy 🌌
                                </button>
                            </div>
                            <p class="text-xs text-gray-500 mt-2 text-center">
                                Links will use the search term above.
                            </p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-400 mt-8 text-center">
                        Booking is completed on the linked external websites. FINworld does not process the ticket payment.
                    </p>
                </div>
            `;
        }

        // --- Main Application Renderer ---

        function renderApp() {
            const root = document.getElementById('app-root');
            if (!root) return;

            // 1. Render Login Screen if not logged in (mock)
            if (!state.isLoggedIn) {
                root.innerHTML = renderLoginScreen();
                return;
            }

            // 2. Render main app if logged in
            if (state.isLoading || !state.isAuthReady) {
                root.innerHTML = renderLoader();
                return;
            }

            const currentUserName = state.userData?.name || 'Guest';

            let contentHtml = '';
            switch (state.activeView) {
                case 'transfer':
                    contentHtml = renderTransfer();
                    break;
                case 'history':
                    contentHtml = renderHistory();
                    break;
                case 'profile':
                    contentHtml = renderProfile();
                    break;
                case 'services':
                    contentHtml = renderServices();
                    break;
                case 'dashboard':
                default:
                    contentHtml = renderDashboard();
                    break;
            }

            const navItems = [
                { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', emoji: '🏠' },
                { id: 'transfer', label: 'Transfer', icon: 'Send', emoji: '💸' },
                { id: 'history', label: 'History', icon: 'History', emoji: '📜' },
                { id: 'profile', label: 'Profile', icon: 'User', emoji: '👤' },
                { id: 'services', label: 'Services', icon: 'Zap', emoji: '✈️' },
            ];

            const navHtml = navItems.map(item => `
                <button
                    onclick="window.setState({ activeView: '${item.id}' })"
                    class="w-full flex items-center p-3 rounded-xl transition duration-150 font-medium ${
                        state.activeView === item.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }"
                >
                    ${createIcon(item.icon, 'w-5 h-5 mr-3')}
                    ${item.label} ${item.emoji}
                </button>
            `).join('');


            root.innerHTML = `
                <header class="bg-white shadow-md">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 class="text-3xl font-extrabold text-indigo-600 tracking-tight">
                            ✨ FIN<span class="text-gray-800">world</span> 🚀
                        </h1>
                        <div class="flex items-center space-x-4">
                            <span class="text-xl font-extrabold text-gray-900 hidden sm:block">
                                Welcome, <span class="text-indigo-600">${currentUserName}</span>
                            </span>
                            <button
                                onclick="window.setState({ showChatModal: true })"
                                title="Help & Support (Gemini AI)"
                                class="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition duration-150"
                            >
                                ${createIcon('message-square', 'w-5 h-5')}
                            </button>
                            <button
                                onclick="window.handleLogout()"
                                title="Sign Out"
                                class="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition duration-150"
                            >
                                ${createIcon('log-out', 'w-5 h-5')}
                            </button>
                        </div>
                    </div>
                </header>

                <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="lg:flex lg:space-x-8">
                        <!-- Sidebar Navigation -->
                        <nav class="lg:w-64 lg:shrink-0 mb-6 lg:mb-0">
                            <div class="bg-white p-4 shadow-xl rounded-2xl border border-gray-100 space-y-2">
                                ${navHtml}
                                <div class="pt-4 border-t mt-4 text-xs text-gray-400 text-center">
                                    User ID: ${state.userId || 'Authenticating...'}
                                </div>
                            </div>
                        </nav>

                        <!-- Main Content Area -->
                        <div class="lg:flex-1">
                            ${contentHtml}
                        </div>
                    </div>
                </main>

                <footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
                    &copy; ${new Date().getFullYear()} FINworld. All rights reserved. (Simulated Banking Platform)
                    <div class="mt-2 text-base font-semibold">
                        <a href="tel:10009000" class="text-indigo-600 hover:text-indigo-800 transition flex items-center justify-center">
                            ${createIcon('phone', 'w-4 h-4 mr-2')} Call FINworld Support: 1000 9000
                        </a>
                    </div>
                </footer>
            `;
            
            // Re-initialize Lucide Icons for newly inserted HTML
            createIcons({ icons });

            // Ensure insight loads on dashboard view
            if (state.activeView === 'dashboard' && state.insight === null && !state.isInsightLoading) {
                 window.callGeminiForInsight();
            }
        }
        
        // --- Event Handlers & Components ---
        
        window.handleNameSave = async function() {
            const nameInput = document.getElementById('nameInput');
            const saveButton = document.getElementById('saveNameButton');
            if (!nameInput || !saveButton) return;

            const newName = nameInput.value.trim();
            if (!newName) {
                showMessage('error', 'Name cannot be empty. 🚫');
                return;
            }
            if (newName === state.userData.name) {
                window.toggleNameEdit(false);
                return;
            }

            saveButton.disabled = true;
            saveButton.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>`;
            createIcons({ icons });

            try {
                // Update state directly for mock
                setState({ userData: { ...state.userData, name: newName } });
                showMessage('success', 'Name updated successfully! 🎉');
                window.toggleNameEdit(false);
            } catch (error) {
                console.error("Error updating profile:", error);
                showMessage('error', 'Failed to update name. ❌');
            } finally {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Save';
            }
        }

        window.toggleNameEdit = function(isEditing) {
            const nameDisplay = document.getElementById('nameDisplay');
            const nameEditForm = document.getElementById('nameEditForm');
            if (!nameDisplay || !nameEditForm) return;

            if (isEditing) {
                nameDisplay.classList.add('hidden');
                nameEditForm.classList.remove('hidden');
            } else {
                nameDisplay.classList.remove('hidden');
                nameEditForm.classList.add('hidden');
            }
            document.getElementById('nameInput').value = state.userData.name; // Reset on cancel
            createIcons({ icons });
        }


        // --- Transfer Form Submission Handler ---
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'transferForm') {
                e.preventDefault();
                await handleTransferSubmit();
            }
        });

        async function handleTransferSubmit() {
            const sourceAccount = document.getElementById('sourceAccount').value;
            const destinationType = document.getElementById('destinationType').value;
            const externalRecipient = document.getElementById('externalRecipient').value;
            const amountInput = document.getElementById('transferAmount');
            const transferSubmitButton = document.getElementById('transferSubmitButton');
            
            const transferAmount = parseFloat(amountInput.value);

            if (!state.userId) { showMessage('error', 'Authentication not ready.'); return; }
            if (transferAmount <= 0 || isNaN(transferAmount)) { showMessage('error', 'Please enter a valid amount.'); return; }

            const source = state.userData.accounts.find(acc => acc.id === sourceAccount);
            const destinationAccount = state.userData.accounts.find(acc => acc.id === destinationType);
            
            if (!source || source.balance < transferAmount) { showMessage('error', 'Insufficient funds or invalid source account.'); return; }
            if (sourceAccount === destinationType) { showMessage('error', 'Source and destination cannot be the same account.'); return; }
            if (destinationType === 'EXTERNAL' && !externalRecipient.trim()) { showMessage('error', 'Please enter a recipient ID for external transfer.'); return; }

            // Start processing UI
            transferSubmitButton.disabled = true;
            transferSubmitButton.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i> Processing...`;
            createIcons({ icons });
            showMessage('success', 'Transfer initiated...');

            try {
                const now = new Date();
                const nowISO = now.toISOString();
                
                let newTransactions = [];
                let updatedAccounts = state.userData.accounts.map(acc => ({...acc}));

                // 1. Debit Source Account
                const sourceIndex = updatedAccounts.findIndex(acc => acc.id === sourceAccount);
                updatedAccounts[sourceIndex].balance = parseFloat((updatedAccounts[sourceIndex].balance - transferAmount).toFixed(2));
                
                const debitTxId = now.getTime() + Math.random();
                newTransactions.push({
                    id: debitTxId,
                    date: nowISO,
                    description: destinationType === 'EXTERNAL' ? `Transfer to ${externalRecipient}` : `Internal Transfer to ${destinationAccount.name}`,
                    amount: -transferAmount,
                    type: 'Debit',
                    accountId: sourceAccount,
                });

                // 2. Credit Destination Account (Internal Transfer Only)
                if (destinationType !== 'EXTERNAL' && destinationAccount) {
                    const destIndex = updatedAccounts.findIndex(acc => acc.id === destinationType);
                    updatedAccounts[destIndex].balance = parseFloat((updatedAccounts[destIndex].balance + transferAmount).toFixed(2));

                    const creditTxId = now.getTime() + Math.random() + 1;
                    newTransactions.push({
                        id: creditTxId,
                        date: nowISO,
                        description: `Internal Transfer from ${source.name}`,
                        amount: transferAmount,
                        type: 'Credit',
                        accountId: destinationType,
                    });
                }

                // Update state with new data
                setState({
                    userData: {
                        ...state.userData,
                        accounts: updatedAccounts,
                        transactions: [...state.userData.transactions, ...newTransactions]
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 1000)); 

                // --- Receipt Generation ---
                setState({
                    receiptDetails: {
                        timestamp: now,
                        amount: transferAmount,
                        sourceName: source.name,
                        sourceId: source.id,
                        recipient: destinationType === 'EXTERNAL' ? externalRecipient : destinationAccount.name,
                        confId: debitTxId.toString().split('.')[0].slice(-8),
                    },
                    isSavingReceipt: false,
                });

                // Reset form fields
                amountInput.value = '';
                document.getElementById('externalRecipient').value = '';
                document.getElementById('destinationType').value = 'EXTERNAL';
                window.handleDestinationChange('EXTERNAL');
                showMessage('success', 'Transfer completed successfully!');

            } catch (error) {
                console.error("Transfer Error:", error);
                showMessage('error', 'Transfer failed. Check console for details. ❌');
            } finally {
                transferSubmitButton.disabled = false;
                transferSubmitButton.innerHTML = `${createIcon('send', 'w-5 h-5 mr-2')} Complete Transfer`;
                createIcons({ icons });
            }
        }

        // --- Mock Login Screen Rendering & Handler ---

        const MOCK_USERNAME = 'Minh1000';
        const MOCK_PASSWORD = 'Minh123123';

        function renderLoginScreen() {
            const isLoadingAuth = !state.isAuthReady;
            const authStatus = isLoadingAuth ? `
                <div class="flex items-center justify-center p-4 bg-yellow-100 text-yellow-800 rounded-xl mb-4">
                    ${createIcon('loader-2', 'w-5 h-5 mr-2 animate-spin')} 
                    Authenticating User Session...
                </div>
            ` : '';
            
            return `
                <div class="flex flex-col items-center justify-center min-h-screen bg-indigo-700 p-4">
                    <div class="w-full max-w-md bg-white p-8 shadow-2xl rounded-2xl">
                        <h1 class="text-4xl font-extrabold text-center text-indigo-600 mb-2">
                            FIN<span class="text-gray-800">world</span> Login
                        </h1>
                        <p class="text-center text-gray-500 mb-6">Secure Access Required</p>
                        ${authStatus}
                        
                        <div id="login-error-message" class="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 mb-4 hidden"></div>

                        <form id="loginForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    id="usernameInput"
                                    placeholder="${MOCK_USERNAME}"
                                    value="${MOCK_USERNAME}"
                                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    id="passwordInput"
                                    placeholder="Enter password"
                                    value="${MOCK_PASSWORD}"
                                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                id="loginSubmitButton"
                                ${isLoadingAuth ? 'disabled' : ''}
                                class="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150"
                            >
                                Secure Login
                            </button>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                await handleLogin();
            }
        });
        
        async function handleLogin() {
            const usernameInput = document.getElementById('usernameInput');
            const passwordInput = document.getElementById('passwordInput');
            const loginButton = document.getElementById('loginSubmitButton');
            const errorMessage = document.getElementById('login-error-message');
            
            if (!usernameInput || !passwordInput || !loginButton || !errorMessage) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            errorMessage.classList.add('hidden');
            loginButton.disabled = true;
            loginButton.innerHTML = `${createIcon('loader-2', 'w-5 h-5 mr-2 animate-spin')} Verifying...`;
            createIcons({ icons });

            setTimeout(async () => {
                if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
                    const generatedUserId = `mock-user-${Math.random().toString(36).slice(2, 10)}`;
                    chatHistory = [{ role: 'model', text: "Hello Minh! I'm FINworld AI Support. How can I help you with your accounts, transfers, or app features today? Ask me anything! 🤖" }];
                    setState({ 
                        isLoggedIn: true, 
                        userData: createInitialUserData(), 
                        isLoading: false, 
                        userId: generatedUserId,
                        activeView: 'dashboard',
                        insight: null,
                        receiptDetails: null,
                        isSavingReceipt: false,
                        movieSearchTerm: '',
                        showChatModal: false,
                    });
                } else {
                    errorMessage.textContent = 'Invalid username or password. Please try again.';
                    errorMessage.classList.remove('hidden');
                    loginButton.disabled = false;
                    loginButton.innerHTML = 'Secure Login';
                }
            }, 1000);
        }

        window.handleLogout = function() {
            if (auth) firebaseSignOut(auth);
            chatHistory = [{ role: 'model', text: "Hello Minh! I'm FINworld AI Support. How can I help you with your accounts, transfers, or app features today? Ask me anything! 🤖" }];
            setState({ 
                userData: null, 
                isLoggedIn: false, 
                isLoading: false,
                activeView: 'dashboard', 
                insight: null, 
                receiptDetails: null,
                isSavingReceipt: false,
                movieSearchTerm: '',
                showChatModal: false,
                userId: null,
            });
        }
        
        // --- Modal Rendering (Receipt and Chat) ---

        function renderReceiptModal(receipt) {
            if (!receipt) return '';
            
            const date = new Date(receipt.timestamp).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });
            const time = new Date(receipt.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });

            const DetailRow = (label, value, iconName, color = 'text-gray-900') => `
                <div class="flex justify-between items-center py-3 border-b border-dashed">
                    <div class="flex items-center text-gray-500">
                        ${createIcon(iconName, 'w-5 h-5 mr-2')}
                        <span class="font-medium">${label}</span>
                    </div>
                    <span class="font-semibold ${color}">${value}</span>
                </div>
            `;
            
            const saveButtonHtml = state.isSavingReceipt ? 
                 `<div class="w-full py-3 px-4 mb-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium flex items-center justify-center border border-emerald-300">
                    ${createIcon('check', 'w-5 h-5 mr-2')} Receipt Saved!
                 </div>` :
                 `<button 
                    onclick="window.saveReceipt()" 
                    id="saveReceiptButton"
                    class="w-full py-3 px-4 mb-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center"
                 >
                    ${createIcon('receipt', 'w-5 h-5 mr-2')} Save Receipt Permanently
                 </button>`;

            return `
                <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col transform scale-100 transition-transform duration-300">
                        
                        <!-- Header -->
                        <div class="p-6 bg-emerald-600 rounded-t-2xl text-white text-center">
                            <i data-lucide="check" class="w-10 h-10 mx-auto mb-2 bg-white text-emerald-600 p-1 rounded-full animate-bounce-in"></i>
                            <h3 class="text-2xl font-bold">Transfer Successful!</h3>
                            <p class="text-4xl font-extrabold mt-3">${formatCurrency(receipt.amount, 'USD')}</p>
                            <p class="text-sm font-medium opacity-80 mt-1">Amount Transferred</p>
                        </div>

                        <!-- Receipt Body -->
                        <div class="p-6 space-y-2">
                            ${DetailRow("Transaction Date", date, 'calendar')}
                            ${DetailRow("Transaction Time", time, 'clock')}
                            ${DetailRow("Source Account", receipt.sourceName, 'credit-card')}
                            ${DetailRow("Source ID", receipt.sourceId, 'receipt', "text-gray-500 text-xs font-mono")}
                            ${DetailRow("Recipient Name/ID", receipt.recipient, 'user')}
                            ${DetailRow("Confirmation ID", receipt.confId, 'check', "text-gray-500 text-xs font-mono")}
                        </div>
                        
                        <!-- Footer with Save Option -->
                        <div class="p-4 border-t text-center">
                            ${saveButtonHtml}
                            <button 
                                onclick="window.setState({ receiptDetails: null, isSavingReceipt: false })" 
                                class="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                            >
                                Close
                            </button>
                            <p class="text-xs text-gray-400 mt-3">Transaction history recorded automatically.</p>
                        </div>

                    </div>
                </div>
            `;
        }
        
        window.saveReceipt = async function() {
            if (!state.receiptDetails || state.isSavingReceipt) return;
            
            // Temporary visual state update (non-global state)
            const saveButton = document.getElementById('saveReceiptButton');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i> Saving...`;
                createIcons({ icons });
            }

            try {
                // Update state directly for mock
                const receiptData = {
                    confId: state.receiptDetails.confId,
                    timestamp: state.receiptDetails.timestamp.toISOString(),
                    amount: state.receiptDetails.amount,
                    sourceId: state.receiptDetails.sourceId,
                    sourceName: state.receiptDetails.sourceName,
                    recipient: state.receiptDetails.recipient,
                };

                setState({ 
                    userData: { 
                        ...state.userData, 
                        savedReceipts: [...(state.userData.savedReceipts || []), receiptData] 
                    },
                    isSavingReceipt: true 
                });
            } catch (error) {
                console.error("Error saving receipt:", error);
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = `${createIcon('receipt', 'w-5 h-5 mr-2')} Save Receipt Permanently`;
                    createIcons({ icons });
                    showMessage('error', 'Failed to save receipt.');
                }
            }
        }
        
    const DEFAULT_CHAT_HISTORY = [{ role: 'model', text: "Hello Minh! I'm FINworld AI Support. How can I help you with your accounts, transfers, or app features today? Ask me anything! 🤖" }];
    let chatHistory = [...DEFAULT_CHAT_HISTORY];
        
        window.handleChatSubmit = async function(e) {
            e.preventDefault();
            const inputElement = document.getElementById('chatInput');
            if (!inputElement) return;
            
            const currentInput = inputElement.value.trim();
            if (!currentInput) return;
            
            const newUserMessage = { role: 'user', text: currentInput };
            chatHistory = [...chatHistory, newUserMessage];
            inputElement.value = ''; // Clear input immediately
            renderChatModalContent();

            await callGeminiForChat(currentInput);
        }
        
        async function callGeminiForChat(currentInput) {
            const chatBody = document.getElementById('chatBody');
            const chatEndRef = document.getElementById('chatEnd');
            
            if (!chatBody || !chatEndRef) return;
            
            chatBody.insertAdjacentHTML('beforeend', `
                <div id="loadingMessage" class="flex justify-start">
                     <div class="max-w-[80%] p-3 rounded-xl shadow-md text-sm bg-gray-100 text-gray-800 rounded-tl-none">
                        <p class="font-semibold text-xs mb-1">FINworld AI</p>
                        ${createIcon('loader-2', 'w-4 h-4 animate-spin inline-block mr-2')} Typing...
                    </div>
                </div>
            `);
            chatEndRef.scrollIntoView({ behavior: "smooth" });

            const systemPrompt = "You are FINworld AI Support, a friendly, professional, and knowledgeable banking chatbot. Your responses must be concise and directly address the user's banking or app-related questions. Do not use markdown headers, lists, or code blocks. Speak in a helpful and conversational tone. Today's date is October 6, 2025.";

            if (!geminiApiKey) {
                document.getElementById('loadingMessage')?.remove();
                chatHistory = [...chatHistory, { role: 'model', text: "AI support is unavailable in this offline demo. Configure an API key to enable chat." }];
                renderChatModalContent();
                return;
            }

            const payload = {
                contents: [{ parts: [{ text: currentInput }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
            };

            const maxRetries = 3;
            const baseDelay = 1000;
            let modelResponse = "I'm having trouble connecting to the support server. Please try again later. 😔";

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(geminiApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        if (response.status === 429 && i < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, baseDelay * (2 ** i)));
                            continue; 
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    modelResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || modelResponse;
                    break; 

                } catch (error) {
                    console.error("Gemini API Error:", error);
                }
            }
            
            // Remove loading message
            document.getElementById('loadingMessage')?.remove();
            
            // Add final response
            chatHistory = [...chatHistory, { role: 'model', text: modelResponse }];
            renderChatModalContent();
        }

        function renderChatModalContent() {
            const chatModal = document.getElementById('chatModal');
            if (!chatModal) return;
            
            const chatBodyHtml = chatHistory.map(msg => `
                <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%] p-3 rounded-xl shadow-md text-sm ${
                        msg.role === 'user' ? 'bg-indigo-100 text-gray-800 rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }">
                        <p class="font-semibold text-xs mb-1">${msg.role === 'user' ? 'You' : 'FINworld AI'}</p>
                        ${msg.text}
                    </div>
                </div>
            `).join('');

            chatModal.innerHTML = `
                <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-full max-h-[80vh] flex flex-col">
                        <!-- Header -->
                        <div class="p-4 border-b bg-indigo-600 rounded-t-2xl flex justify-between items-center">
                            <h3 class="text-xl font-bold text-white flex items-center">
                                ${createIcon('message-square', 'w-5 h-5 mr-2')} FINworld AI Support
                            </h3>
                            <button onclick="window.setState({ showChatModal: false })" class="text-white hover:text-indigo-200 transition">
                                ${createIcon('x', 'w-6 h-6')}
                            </button>
                        </div>
                        
                        <!-- Chat Body -->
                        <div id="chatBody" class="flex-1 overflow-y-auto p-4 space-y-4">
                            ${chatBodyHtml}
                            <div id="chatEnd"></div>
                        </div>

                        <!-- Input Footer -->
                        <form onsubmit="window.handleChatSubmit(event)" class="p-4 border-t">
                            <div class="flex space-x-2">
                                <input
                                    type="text"
                                    id="chatInput"
                                    placeholder="Ask a question about FINworld..."
                                    class="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    class="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                                    title="Send Message"
                                >
                                    ${createIcon('arrow-up-right', 'w-6 h-6')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            // Re-initialize Lucide Icons for modal
            createIcons({ icons });
            document.getElementById('chatEnd')?.scrollIntoView({ behavior: "smooth" });
        }

        function renderModals() {
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) return;

            let html = '';
            if (state.receiptDetails) {
                html += renderReceiptModal(state.receiptDetails);
            }
            if (state.showChatModal) {
                 html += `<div id="chatModal">${renderChatModalContent()}</div>`;
            } else {
                html += `<div id="chatModal"></div>`;
            }
            modalContainer.innerHTML = html;
        }

        // --- Initial Setup and Main Loop ---
        
        initializeFirebase().then(() => {
            // Check if mock login should be bypassed for initial loading
            if (state.isAuthReady && state.userId) {
                // If a token was provided, assume logged in until checked
                setState({ isLoggedIn: true });
                fetchUserData();
                setupDataListener();
            } else {
                 // Start with login screen
                 renderApp();
            }
        });

        // Override the setState function to also render modals
        window.setState = (newState) => {
            state = { ...state, ...newState };
            renderApp();
            renderModals();
        };

        // Export core functions to the global scope for HTML event handlers
        window.callGeminiForInsight = callGeminiForInsight;
        window.setState = window.setState;
        window.handleLogout = window.handleLogout;
        window.toggleNameEdit = window.toggleNameEdit;
        window.handleNameSave = window.handleNameSave;
        window.saveReceipt = window.saveReceipt;