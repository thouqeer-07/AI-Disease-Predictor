# Patent Specification: AuraHealth Platform

---

## I. TITLE OF THE INVENTION
**AuraHealth: An Intelligent, Secure, Context-Aware Health Diagnostic and Life-Cycle Managed Telehealth Consultation Architecture with Geolocated Dual-Channel Emergency Dispatch System**

---

## II. ABSTRACT
This invention discloses AuraHealth, a highly integrated, intelligent, and context-aware medical diagnostic, lifestyle-contextualized prediction, and telehealth integration platform. Recognizing the systemic inefficiencies, high diagnostic error rates, and security vulnerabilities of traditional point-in-time clinical evaluations, this system establishes a continuous behavioral diagnostic framework. The platform aggregates user-reported symptoms in real time and correlates them with an active 7-day longitudinal history of lifestyle metrics, including daily steps, sleep quality and duration, water consumption, and caloric expenditure. An AI-driven contextual diagnostics engine processes these inputs to output a ranked list of predicted medical conditions with associated confidence intervals, physiological explanations, and structured next-step clinical guidance. 

For emergency situations, the platform integrates an automated emergency SOS response subsystem governed by a tactile 3-second press-and-hold trigger. Upon activation, the subsystem captures the user's instantaneous GPS coordinates and dispatches dual-channel geolocated alert notifications (simultaneously using SMS and WhatsApp protocols) containing navigation links to pre-configured guardian profiles. 

Furthermore, the system establishes a secure patient-doctor teleconsultation channel regulated by a dynamic database-state machine. Communication channels are strictly governed by lifecycle access states: messaging interfaces remain locked while appointment requests are "Pending" or "Rejected," transition to full read-write duplex sockets when "Accepted," and automatically degrade to read-only archival interfaces when marked "Completed." This multi-layered architecture ensures patient safety, regulatory compliance (e.g., HIPAA and GDPR), and operational boundaries for healthcare practitioners.

---

## III. FIELD OF THE INVENTION
The present invention relates generally to the fields of biomedical informatics, mobile health (mHealth), cloud computing, and telecommunications. More specifically, the invention relates to context-aware clinical decision support systems (CDSS), automated patient triage, real-time physiological parameter logging, and lifecycle-managed teleconsultation sockets. The invention further relates to automated emergency response dispatch frameworks leveraging geolocated coordinates over dual-channel communication networks.

---

## IV. BACKGROUND OF THE INVENTION AND PRIOR ART
Traditional medical diagnostics and telehealth solutions operate on a reactive, point-in-time basis. When a patient schedules a remote visit, the consulting physician is typically presented with subjective, self-reported symptoms captured at a single instance, without longitudinal behavioral context. Lifestyle behaviors—such as sleep deprivation, chronic dehydration, inactivity, and poor nutrition—significantly influence physiological symptoms, yet they are rarely quantified or systematically factored into remote triage. Consequently, existing diagnostics suffer from high rates of false positives, resulting in unnecessary emergency room visits or missed diagnoses.

Additionally, teleconsultation communication channels present severe structural vulnerabilities:
1.  **Lack of Boundary Controls for Clinicians**: Most platforms allow patients to initiate message transfers to doctors at any time, leading to cognitive overload and unpaid clinical liability for providers.
2.  **Post-Consultation Vulnerabilities**: Sockets often remain open indefinitely after an appointment concludes, permitting patients to continue seeking clinical advice without initiating new billable consults or scheduling subsequent appointments.
3.  **Vulnerability to Data Interception**: Patient-doctor chat histories containing protected health information (PHI) are frequently stored in insecure, unencrypted static tables, violating data privacy regulations such as HIPAA and GDPR.

Emergency alert mechanisms in current wearable devices also exhibit high failure rates. Single-channel dispatchers (such as standard SMS) often fail to deliver notifications due to network congestion or recipient filter rules. Furthermore, touch-based triggers are highly susceptible to accidental activation, leading to false dispatches that waste emergency response resources.

Therefore, there is an urgent and unmet technical need for a unified platform that:
*   Contextualizes acute patient-reported symptoms with continuous longitudinal behavioral logs.
*   Enforces strict, database-state-driven boundary locks on teleconsultation channels.
*   Employs a resilient, dual-channel, geolocated emergency dispatcher with a safety-verified physical trigger.

---

## V. SUMMARY OF THE INVENTION
The present invention addresses these needs by introducing AuraHealth, an integrated, intelligent, and context-aware clinical diagnostic and telehealth platform. 

The primary object of the invention is to provide a lifestyle-contextualized AI diagnostics engine. This engine matches a user’s current symptoms against a multi-dimensional array of their past 7-day habits (steps, hydration, sleep, and nutrition logs). By calculating contextual variances, the engine identifies whether symptoms are secondary to lifestyle imbalances or indicative of pathological conditions, outputting a prioritized list of predicted diagnoses.

Another object of the invention is to provide a geolocated emergency SOS response system. The system uses a press-and-hold trigger with a visual safety countdown timer. When triggered, the system resolves device GPS coordinates, formats a navigation URL, and dispatches it over both SMS and WhatsApp APIs to pre-configured guardian endpoints.

Another object of the invention is to provide a lifecycle-locked patient-doctor chat room. The state of the database record for an appointment acts as a cryptographic and structural boundary. When the state is `'pending'` or `'rejected'`, the chat window is completely hidden and locked. When the state transitions to `'accepted'`, the chat window unlocks to allow real-time text and media message exchange. When the state transitions to `'completed'`, the chat interface disables all input fields, transforming into a read-only historical consult log, and displays a booking prompt.

Another object of the invention is to provide continuous health grading. A background cron system evaluates daily activity logs to output grades ('Poor', 'Fair', 'Good', 'Excellent') and updates a patient wellness dashboard.

Another object of the invention is to provide a pill reminder system. This module tracks medicine inventory levels and triggers alerts when stock falls below a predefined threshold, preventing medication compliance gaps.

---

## VI. BRIEF DESCRIPTION OF THE DRAWINGS
The structure and operations of the invention will become apparent from the following drawings:

*   **Figure 1: Architecture Block Diagram of the AuraHealth Platform**  
    Illustrates the data flow and system relationships between the Patient Application, Doctor Connect Portal, AI Diagnostics Engine, Emergency SOS Dispatcher, and the database schema.
*   **Figure 2: State Transition Diagram of the Lifecycle-Locked Consultation Room**  
    Shows the transitions of the appointment record (`'pending'`, `'accepted'`, `'rejected'`, `'completed'`) and their corresponding impact on the chat socket state.
*   **Figure 3: Sequence Flow of the 3-Second Press-and-Hold SOS Dispatcher**  
    Demonstrates the signal loop between the physical screen touch event, GPS resolution, backend dispatcher, and dual-channel API gateways.
*   **Figure 4: Data Flow Diagram of the Lifestyle-Contextualized Diagnostics Engine**  
    Details how symptoms and 7-day physiological logs are parsed, normalized, and evaluated by the AI engine.

---

## VII. SPECIFICATION AND DETAILED DESCRIPTION

### 1. Lifestyle-Contextualized AI Diagnostics Subsystem
The diagnostics subsystem operates by constructing a contextual vector for the patient. Upon initiation, the system extracts the patient's self-reported symptoms (e.g., headache, fatigue, chest pain) and queries the local and remote databases for the preceding 7 days of behavioral logs:
*   **Steps ($S$)**: Daily physical activity count.
*   **Sleep ($Sl$)**: Hours of rest logged per night.
*   **Water ($W$)**: Volume of water consumed in milliliters.
*   **Calories ($C$)**: Active energy burned in kilocalories.

The AI engine calculates a lifestyle correlation score ($L_c$) using weight parameters ($w_s, w_{sl}, w_w, w_c$) assigned to each lifestyle metric based on clinical guidelines. The lifestyle correlation score is mathematically represented as:

$$L_c = \sum_{i=1}^{7} \left( w_s \cdot \bar{S}_i + w_{sl} \cdot \bar{Sl}_i + w_w \cdot \bar{W}_i + w_c \cdot \bar{C}_i \right)$$

where $\bar{X}_i$ represents the normalized deviation of metric $X$ on day $i$ from established clinical health baselines. If $L_c$ falls below a defined critical threshold, the engine infers that the reported symptoms may be aggravated or caused by behavioral factors (e.g., dehydration-induced migraines). The AI engine then outputs the top three predicted medical conditions with their respective probabilities, accompanied by lifestyle adjustment plans and clinical warning signs.

### 2. Press-and-Hold Emergency SOS Subsystem
The SOS subsystem is designed to prevent accidental dispatches while ensuring maximum delivery success during true emergencies. The client application renders a specialized UI component requiring a continuous press-and-hold interaction. 

*   **Tactile Validation Loop**: The system registers a touch-down event and initiates a 3000ms timer. A visual safety circle fills progressively on the screen. If a touch-up event occurs before 3000ms, the timer is cleared and no alert is sent.
*   **Geolocation Resolution**: If the touch is held continuously for 3000ms, the device's GPS hardware is queried via the Geolocation API. The system captures the current latitude ($\theta$) and longitude ($\phi$) with an accuracy tolerance of $\pm 5$ meters.
*   **Dual-Channel Dispatcher**: The coordinates are compiled into a Google Maps URL: `https://www.google.com/maps?q=\theta,\phi`. The backend dispatcher formatting engine creates two distinct payload packets:
    1.  **SMS Packet**: Transmitted via a telephony gateway directly to the guardian's mobile number.
    2.  **WhatsApp Packet**: Dispatched via the WhatsApp Business API to ensure delivery in low-cellular but high-data areas.
    Both packets contain the user's name, the emergency message, and the geolocated navigation link.

### 3. Lifecycle-Locked Consultation Rooms
The patient-doctor communication interface is governed by the state of the `appointments` table. The table schema includes an `id`, `user_id` (patient), `doctor_id`, `appointment_date`, `status`, and `notes`. The chat room page ([Chat.jsx](file:///c:/Users/senth/Videos/TqPdd/web/src/pages/Chat.jsx)) processes the `status` column dynamically to enforce the following states:

| Appointment Status | Chat Interface State | Available Actions |
| :--- | :--- | :--- |
| **`pending`** | **Locked (Hidden)** | None (Renders "Consultation Room Locked" notice screen) |
| **`rejected`** | **Locked (Hidden)** | None (Renders "Consultation Room Locked" notice screen) |
| **`accepted`** | **Active (Duplex)** | Real-time messages (Supabase Postgres channel subscription), call scheduling, text entry |
| **`completed`** | **Read-Only (History)** | Scroll chat logs, view system calls; text input and send buttons are disabled and replaced by a re-booking prompt |

When a doctor changes an appointment's status to `'completed'` via the dashboard, a database trigger or API call updates the record. The client application, which listens to real-time postgres changes, immediately updates the UI for both users. The patient's message input box is unmounted, preventing any further messages from being sent.

### 4. Dynamic Health Scoring Engine
The health scoring engine evaluates logged biometric indicators daily. The system logs sleep duration, steps, water, and calories. At the end of each diurnal cycle, a background script calculates a normalized score out of 100:
*   **Water Score ($S_w$)**: 100 points if water intake $\ge 2500$ ml, scaled linearly down if less.
*   **Steps Score ($S_s$)**: 100 points if steps $\ge 10000$, scaled linearly.
*   **Sleep Score ($S_{sl}$)**: 100 points if sleep is between 7 and 9 hours.
*   **Calorie Score ($S_c$)**: 100 points if active calories burned match the user's metabolic targets.

The composite health grade is calculated as:

$$\text{Health Rating} = 0.3 \cdot S_w + 0.3 \cdot S_s + 0.2 \cdot S_{sl} + 0.2 \cdot S_c$$

The calculated rating is mapped to a categorical grade:
*   **Rating $\ge 85$**: **Excellent**
*   **Rating $\ge 70$ and $< 85$**: **Good**
*   **Rating $\ge 50$ and $< 70$**: **Fair**
*   **Rating $< 50$**: **Poor**

This rating determines the active dashboard widgets, providing patients with visibility into their health trajectory.

### 5. Smart Pill Tracker and Refill Subsystem
To ensure medication compliance, the platform includes a smart tracker. Users schedule medication names, dosage quantities, times of intake, and starting stock counts. 
*   **Compliance Log**: Each time the user marks a pill as `'taken'`, the backend database decrements the corresponding record's `stock_count` by the dosage amount.
*   **Inventory Threshold Alerts**: The system monitors `stock_count`. When `stock_count` falls below the configured threshold (e.g., less than 5 doses remaining), the database triggers a push notification and SMS alert to the patient. This alert prompts them to refill their prescription before they run out.

---

## VIII. DESCRIPTION OF PREFERRED EMBODIMENTS
The platform is deployed across a multi-tier environment, comprising a React-based frontend client, a Redux Toolkit state manager, a Node.js API layer, and a Supabase database cluster with real-time replication.

### Embodiment 1: Executing a Contextual Diagnosis
A patient logging into the AuraHealth application inputs the symptom: "Severe headache and light sensitivity." Before generating predictions, the frontend client queries the Redux store to extract the patient's lifestyle logs. The logs reveal:
*   Average daily water intake for the last 3 days: 800 ml (severe dehydration).
*   Average sleep duration: 4.5 hours (severe sleep deprivation).
*   Daily step counts: 2,000 steps.

The data is submitted to the AI contextual diagnostic server. The engine recognizes that the acute symptoms (headache, photophobia) are highly correlated with the underlying dehydration and fatigue vectors. The engine returns:
1.  **Primary Prediction**: Dehydration-induced tension headache (85% probability).
2.  **Secondary Prediction**: Sleep deprivation migraine (10% probability).
3.  **Tertiary Prediction**: Early-stage tension headache (5% probability).

The interface displays a warning message highlighting the low hydration and sleep levels, advises the patient to consume 1000ml of water immediately, rest in a dark room, and monitors for subsequent red-flag symptoms.

### Embodiment 2: Doctor-Patient Live consultation Lifecycle
1.  **Patient Request**: The patient books an appointment with a consulting cardiologist. The patient enters notes: "Experiencing occasional chest flutters after running." The appointment is saved with status `'pending'`.
2.  **Access Restriction**: The patient tries to access the chat interface at `/chat/:appointmentId`. The component checks the appointment record in the database. Since the status is `'pending'`, the component returns the locked UI, preventing the patient from initiating messages.
3.  **Doctor Review and Approval**: The cardiologist opens their dashboard, reviews the pending list, reads the patient's chest flutter notes, and clicks **Accept**. The status updates to `'accepted'`.
4.  **Active Consult**: The chat page dynamically unlocks for both users. They exchange text messages and files. The doctor uses the "Schedule Call" modal to schedule a virtual follow-up call. This action logs a system message in the chat log.
5.  **Completion**: The doctor determines the consult is complete and clicks the **Complete** button on their panel. The database status changes to `'completed'`. 
6.  **Archival Transition**: The chat page immediately disables the text input field and send button. The system mounts the read-only notice: *"This consultation has been marked as completed. The chat is now in read-only history mode."* The patient is presented with a button to book another consultation if further communication is needed.

---

## IX. THE CLAIMS
**WE CLAIM:**

1.  A context-aware medical diagnostic and telehealth platform comprising:
    *   a user interface configured to capture clinical symptoms and daily physiological logs;
    *   a database storing said symptoms, daily physiological logs, and appointment records, where each appointment record is associated with a specific lifecycle status;
    *   an AI contextual diagnostic engine configured to compute a lifestyle correlation score based on said physiological logs and adjust disease prediction probabilities accordingly; and
    *   a communication interface connecting patients and doctors, wherein access is dynamically controlled by the lifecycle status of the corresponding appointment record.

2.  The platform of claim 1, wherein the lifecycle status is selected from the group consisting of `'pending'`, `'accepted'`, `'rejected'`, and `'completed'`.

3.  The platform of claim 2, wherein the communication interface is completely locked and inaccessible when the lifecycle status is `'pending'` or `'rejected'`.

4.  The platform of claim 2, wherein the communication interface enables real-time message exchange between the patient and the doctor when the lifecycle status is `'accepted'`.

5.  The platform of claim 2, wherein the communication interface transitions to a read-only historical viewer and disables message sending capabilities when the lifecycle status is updated to `'completed'`.

6.  The platform of claim 1, further comprising a geolocated emergency alert subsystem comprising:
    *   a press-and-hold interactive trigger component on the user interface;
    *   a validator configured to verify that the trigger is held continuously for a threshold duration of 3 seconds;
    *   a geolocation resolver configured to extract the coordinates of the device; and
    *   a dual-channel communication dispatcher configured to transmit emergency alerts containing the resolved coordinates over both SMS and WhatsApp protocols simultaneously.

7.  The platform of claim 1, further comprising a health grading engine configured to:
    *   calculate individual wellness scores for steps, hydration, sleep, and caloric expenditure;
    *   compute a weighted average composite score; and
    *   display a categorical health grade selected from "Poor", "Fair", "Good", and "Excellent" on a patient dashboard.

8.  The platform of claim 1, further comprising a smart medication inventory system configured to:
    *   log medication compliance updates;
    *   decrement a stock count parameter in the database upon logging compliance; and
    *   dispatch automated push notifications when the stock count parameter drops below a predefined threshold.
