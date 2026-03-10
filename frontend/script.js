
const AGENTS = [
  { id: 'planner',    icon: '🧠', name: 'Planner',    subtitle: 'Plans research tasks'   },
  { id: 'search',     icon: '🔍', name: 'Search',     subtitle: 'Retrieves information'  },
  { id: 'summarizer', icon: '📝', name: 'Summarizer', subtitle: 'Condenses key ideas'    },
  { id: 'validator',  icon: '✅', name: 'Validator',  subtitle: 'Checks quality'         },
  { id: 'presenter',  icon: '📊', name: 'Presenter',  subtitle: 'Formats final report'   },
];

//2. WHERE WE SEND THE RESEARCH REQUEST 

const API_URL = 'http://localhost:8080/api/research';


//3. fillQuery()

function fillQuery(el) {
  document.getElementById('queryInput').value = el.textContent;
}


//4. renderAgents() 


function renderAgents(statuses = {}) {
  const grid = document.getElementById('agentsGrid');

  
  grid.innerHTML = AGENTS.map(agent => {
    const state = statuses[agent.id] || 'idle'; 

    
    return `
      <div class="agent-card ${state}" id="card-${agent.id}">
        <div class="agent-icon">${agent.icon}</div>
        <div class="agent-name">${agent.name}</div>
        <div class="agent-status">${stateLabel(state)}</div>
      </div>
    `;
  }).join(''); 
}


function stateLabel(state) {
  const labels = {
    idle:    '— waiting',
    running: '◉ running',
    done:    '✓ done',
    error:   '✗ error',
  };
  return labels[state] || '—';
}


//5. setAgentState()
function setAgentState(agentId, state) {
  const card = document.getElementById(`card-${agentId}`);
  if (!card) return;


  card.className = `agent-card ${state}`;

  
  card.querySelector('.agent-status').textContent = stateLabel(state);
}


//6. showError() / hideError()
function showError(message) {
  const box = document.getElementById('errorBox');
  box.textContent = `⚠  ${message}`;
  box.classList.add('visible'); 
}

function hideError() {
  document.getElementById('errorBox').classList.remove('visible');
}


//7. startResearch()
async function startResearch() {
  
  const query = document.getElementById('queryInput').value.trim();
  

  if (!query) {
    showError('Please enter a research question first.');
    return; 
  }

  hideError();

  
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" style="animation:spin 1s linear infinite">
      <path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"/>
    </svg>
    Running...
  `;

  const pipelinePanel = document.getElementById('pipelinePanel');
  const resultPanel   = document.getElementById('resultPanel');

  pipelinePanel.classList.add('visible');    
  resultPanel.classList.remove('visible');   
  renderAgents();                            

  try {

    const report = await runPipeline(query);

  
    resultPanel.classList.add('visible');
    await typeText(document.getElementById('reportContent'), report);

  } catch (err) {
  
    showError(err.message || 'An unexpected error occurred.');
    AGENTS.forEach(agent => setAgentState(agent.id, 'error'));
  }

  
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
    Run Agents
  `;
}


async function runPipeline(query) {

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


  for (let i = 0; i < AGENTS.length - 1; i++) {
    const agent = AGENTS[i];

    setAgentState(agent.id, 'running');         
    await delay(agent.id === 'search' ? 1500 : 900); 
    setAgentState(agent.id, 'done');            
  }

  
  setAgentState('presenter', 'running');

 
  let report;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

   
    const data = await response.json();
    report = data.report;

  } catch (err) {
   
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      console.warn('Backend not reachable — using mock report for UI testing.');
      await delay(1200); 
      report = getMockReport(query);
    } else {
      throw err; 
    }
  }

  
  setAgentState('presenter', 'done');

  return report;
}




async function typeText(element, text, speed = 7) {
  
  element.innerHTML = '';

  
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  element.appendChild(cursor);

  return new Promise(resolve => {
    let index = 0; 

    function typeNextChar() {
      if (index < text.length) {
        
        cursor.insertAdjacentText('beforebegin', text[index]);
        index++;
        setTimeout(typeNextChar, speed); 
      } else {
    
        cursor.remove();
        element.innerHTML = formatReport(text); 
        resolve(); 
      }
    }

    typeNextChar(); 
  });
}



function formatReport(text) {
  return text
    
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

   
    .replace(/^[•\-] (.+)$/gm, '<ul><li>$1</li></ul>')

  
    .replace(/<\/ul>\s*<ul>/g, '')

    .replace(/\n\n/g, '<br/><br/>')

   
    .replace(/\n/g, '<br/>');
}



function getMockReport(query) {
  return `## Research Summary: ${query}

**Overview**
This is a mock report — shown because the Spring Boot backend is not running yet. Start your backend at localhost:8080 to see real GPT-4 results.

## Key Concepts

• Core Concept 1: The foundational idea of the field
• Core Concept 2: Secondary principle with broad applications
• Core Concept 3: Emerging area of active research

## Important Research Papers

**[2024]** Foundational paper establishing the theoretical basis
**[2023]** Breakthrough work advancing state of the art
**[2022]** Comprehensive survey of recent developments

## Open Challenges

• Scalability at production level
• Interpretability and explainability
• Real-world deployment constraints

---
*Generated by AMARA · 5 Agents · GPT-4*`;
}