USE webrpg;

-- 1. ALIGN PASSING SCORE WITH PLV MST 4 STANDARD (75.00%)
ALTER TABLE assessments MODIFY COLUMN passing_score DECIMAL(5,2) NOT NULL DEFAULT 75.00;
UPDATE assessments SET passing_score = 75.00;

-- 2. UPDATE THE 5 LESSONS TO MST 4 WEB BROWSING SAFETY MODULES
UPDATE lessons SET
  title = 'Lesson 1: Safe Web Browsing & Online Communities',
  content = 'Anchored to MST 4 (Weeks 3-5): Learn how the World Wide Web works, how to inspect URLs and HTTPS encryption, and how to interact safely inside online communities without exposing your device or identity.'
WHERE lesson_id = 1;

UPDATE lessons SET
  title = 'Lesson 2: Phishing, Scams & Online Threats',
  content = 'Anchored to MST 4 (Weeks 10-12): Identify real-world online and technology threats—including phishing links, fake login pages, pop-up malware, and social engineering—and practice how to neutralize them.'
WHERE lesson_id = 2;

UPDATE lessons SET
  title = 'Lesson 3: Social Media Safety & Youth Digital Ethics',
  content = 'Anchored to MST 4 (Weeks 10-12): Examine how social media affects teenagers daily, manage oversharing and cyberbullying risks, and apply ethical online communication habits.'
WHERE lesson_id = 3;

UPDATE lessons SET
  title = 'Lesson 4: Data Privacy & R.A. 10173 (Data Privacy Act)',
  content = 'Anchored to MST 4 (Weeks 6-7): Understand how websites collect and control digital information, configure strict browser/app privacy settings, and know your rights under the Philippine Data Privacy Act of 2012 (R.A. 10173).'
WHERE lesson_id = 4;

UPDATE lessons SET
  title = 'Lesson 5: Safe Online Gaming & Digital Trends',
  content = 'Anchored to MST 4 (Weeks 13-14): Analyze the benefits and drawbacks of online gaming, spot fake top-up sites, account-stealing links, and online gambling traps targeting teenagers.'
WHERE lesson_id = 5;

-- 3. CLEAR PLACEHOLDER PRE-TEST QUESTIONS FOR LESSONS 1-5 (assessment_id: 1, 8, 15, 22, 29)
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM answer_options WHERE question_id IN (
  SELECT question_id FROM questions WHERE assessment_id IN (1, 8, 15, 22, 29)
);
DELETE FROM questions WHERE assessment_id IN (1, 8, 15, 22, 29);
SET FOREIGN_KEY_CHECKS = 1;

-- 4. INSERT 25 MST 4-ALIGNED SCENARIO QUESTIONS (5 PER LESSON PRE-TEST)
INSERT INTO questions (question_id, assessment_id, question_text, points, question_order, updated_by) VALUES
-- LESSON 1 PRE-TEST (assessment_id = 1)
(1001, 1, 'Before entering your password on a website, what should you check in the browser address bar to ensure your connection is encrypted?', 1, 1, 1),
(1002, 1, 'You receive a link to "http://valenzuela-gov-free-wifi.xyz/login" in a public group chat. What is the safest first step?', 1, 2, 1),
(1003, 1, 'Why is using public, unsecured Wi-Fi without protection risky when logging into personal accounts?', 1, 3, 1),
(1004, 1, 'In an online community forum, a stranger asks for your school name and daily schedule to "verify" your membership. What should you do?', 1, 4, 1),
(1005, 1, 'Which of the following is the strongest password practice for protecting your web accounts?', 1, 5, 1),

-- LESSON 2 PRE-TEST (assessment_id = 8)
(1006, 8, 'You get an urgent message claiming your account will be deleted in 10 minutes unless you click a shortened link. What type of threat is this?', 1, 1, 1),
(1007, 8, 'A pop-up window flashes on your screen saying "YOUR DEVICE HAS 5 VIRUSES! CLICK HERE TO CLEAN NOW." What is the safest response?', 1, 2, 1),
(1008, 8, 'A website offers a free cracked version of a paid app as a ".exe" or ".apk" file from an unknown source. What is the primary risk?', 1, 3, 1),
(1009, 8, 'Someone pretends to be a tech support agent and asks for the 6-digit One-Time Password (OTP) sent to your phone. What should you do?', 1, 4, 1),
(1010, 8, 'Which red flag most strongly indicates a fake phishing website?', 1, 5, 1),

-- LESSON 3 PRE-TEST (assessment_id = 15)
(1011, 15, 'Posting a photo of your school ID and real-time location on a public social media story mainly puts you at risk of:', 1, 1, 1),
(1012, 15, 'A classmate shares an edited, humiliating photo of another student in a group chat. What is the most responsible digital citizenship action?', 1, 2, 1),
(1013, 15, 'You see a viral social media post promising cash prizes if you comment your full name, birthday, and phone number. What should you do?', 1, 3, 1),
(1014, 15, 'How can teenagers reduce the negative effects of excessive social media use?', 1, 4, 1),
(1015, 15, 'Before sharing a shocking news headline on social media, what is the best habit to practice?', 1, 5, 1),

-- LESSON 4 PRE-TEST (assessment_id = 22)
(1016, 22, 'Which Philippine law protects citizens against the unauthorized collection, use, and disclosure of personal information?', 1, 1, 1),
(1017, 22, 'Under R.A. 10173 (Data Privacy Act of 2012), what right allows you to know why a website is collecting your personal data before you agree?', 1, 2, 1),
(1018, 22, 'A simple flashlight or calculator app asks for permission to access your contacts, microphone, and GPS location. What should you do?', 1, 3, 1),
(1019, 22, 'What is a "digital footprint"?', 1, 4, 1),
(1020, 22, 'When a website asks you to "Accept All Cookies," what is the most privacy-conscious choice?', 1, 5, 1),

-- LESSON 5 PRE-TEST (assessment_id = 29)
(1021, 29, 'A website advertises "90% OFF Game Diamonds/Robux—Just Log In With Your Game Password!" What is this most likely?', 1, 1, 1),
(1022, 29, 'Why are illegal online gambling and loot-box betting sites especially dangerous for teenagers?', 1, 2, 1),
(1023, 29, 'An online gaming teammate sends you a link to download a "free aimbot/cheat tool." What is the safest action?', 1, 3, 1),
(1024, 29, 'Which feature best protects your gaming account even if someone guesses your password?', 1, 4, 1),
(1025, 29, 'How can online gaming remain beneficial for students according to digital literacy best practices?', 1, 5, 1);

-- 5. INSERT 100 ANSWER OPTIONS (4 PER QUESTION)
INSERT INTO answer_options (question_id, option_text, is_correct) VALUES
-- L1
(1001, 'HTTPS protocol and the legitimate domain name', 1),
(1001, 'Whether the page has colorful animations', 0),
(1001, 'The number of ads displayed on the homepage', 0),
(1001, 'Whether the site loads in under two seconds', 0),

(1002, 'Avoid clicking it and verify the official URL directly through a trusted source', 1),
(1002, 'Click it immediately to test if the Wi-Fi works', 0),
(1002, 'Forward it to your classmates so they can try it first', 0),
(1002, 'Log in using your main email and password', 0),

(1003, 'Attackers on the same network can intercept unencrypted data or spoof login pages', 1),
(1003, 'Public Wi-Fi automatically deletes all photos on your phone', 0),
(1003, 'Public Wi-Fi permanently slows down your processor', 0),
(1003, 'Websites block all public Wi-Fi users by default', 0),

(1004, 'Refuse to share personal details and report or leave the group if pressured', 1),
(1004, 'Give your school name but hide your last name', 0),
(1004, 'Send a photo of your school ID to prove you are a student', 0),
(1004, 'Share your schedule only if they promise to keep it secret', 0),

(1005, 'Using a unique, long passphrase combining letters, numbers, and symbols for each account', 1),
(1005, 'Using your birthday so it is easy to remember everywhere', 0),
(1005, 'Reusing one strong password across all social media and gaming sites', 0),
(1005, 'Saving your password in a public comment or bio', 0),

-- L2
(1006, 'Phishing / social engineering using false urgency', 1),
(1006, 'A routine operating system update', 0),
(1006, 'A legitimate cloud backup notification', 0),
(1006, 'Hardware overheating protection', 0),

(1007, 'Close the browser tab immediately without clicking anything inside the pop-up', 1),
(1007, 'Click the pop-up to download the free antivirus scanner', 0),
(1007, 'Call the phone number shown on the pop-up', 0),
(1007, 'Enter your email so they can send a virus report', 0),

(1008, 'The file may contain hidden malware, spyware, or ransomware', 1),
(1008, 'The app will only work during daytime hours', 0),
(1008, 'Your screen brightness will be locked at 50%', 0),
(1008, 'The file will automatically upgrade your internet speed', 0),

(1009, 'Never share the OTP—legitimate support will never ask for it', 1),
(1009, 'Read the OTP aloud if they know your username', 0),
(1009, 'Send the OTP only after they send you a screenshot', 0),
(1009, 'Share the OTP and change your password next week', 0),

(1010, 'Misspelled domain names (e.g., "g00gle-security.net") and requests for sensitive credentials', 1),
(1010, 'A clean minimalist layout with a privacy policy link', 0),
(1010, 'A contact page listing an official office address', 0),
(1010, 'Having a dark mode toggle button', 0),

-- L3
(1011, 'Identity theft, stalking, and targeted social engineering', 1),
(1011, 'Faster battery charging', 0),
(1011, 'Automatic account verification', 0),
(1011, 'Higher grades in online classes', 0),

(1012, 'Refuse to share it, report the content, and support the targeted student', 1),
(1012, 'Repost it as a joke so everyone can see it', 0),
(1012, 'Comment laughing emojis to fit in with the group', 0),
(1012, 'Save the photo to use in future arguments', 0),

(1013, 'Ignore and report the post—it is a data-harvesting scam', 1),
(1013, 'Comment your details quickly before the giveaway closes', 0),
(1013, 'Tag five friends and post your phone number', 0),
(1013, 'Message the page your home address to claim the prize', 0),

(1014, 'Set daily screen-time limits, curate positive feeds, and keep accounts private', 1),
(1014, 'Accept every friend request from strangers to grow followers', 0),
(1014, 'Keep notifications on all night so you never miss a post', 0),
(1014, 'Share every personal argument publicly for advice', 0),

(1015, 'Fact-check the source and verify it against reputable news outlets', 1),
(1015, 'Share it immediately if it already has thousands of likes', 0),
(1015, 'Only read the headline and skip the article', 0),
(1015, 'Add an alarming caption to get more reactions', 0),

-- L4
(1016, 'Republic Act No. 10173 (Data Privacy Act of 2012)', 1),
(1016, 'Republic Act No. 9003 (Ecological Solid Waste Management Act)', 0),
(1016, 'Republic Act No. 8749 (Clean Air Act)', 0),
(1016, 'Republic Act No. 10913 (Anti-Distracted Driving Act)', 0),

(1017, 'The Right to Be Informed', 1),
(1017, 'The Right to Unlimited Free Wi-Fi', 0),
(1017, 'The Right to Bypass Passwords', 0),
(1017, 'The Right to Anonymous Piracy', 0),

(1018, 'Deny the unnecessary permissions and uninstall the suspicious app', 1),
(1018, 'Allow all permissions so the app opens faster', 0),
(1018, 'Allow contacts access only so your friends can use it too', 0),
(1018, 'Ignore the warning because all free apps require GPS', 0),

(1019, 'The trail of data, posts, searches, and activity you leave behind online', 1),
(1019, 'A fingerprint scanner built into a smartphone screen', 0),
(1019, 'A hardware cable used to connect a router to a PC', 0),
(1019, 'A temporary file that disappears as soon as you close a tab', 0),

(1020, 'Customize settings to allow only strictly necessary cookies and reject tracking cookies', 1),
(1020, 'Always click "Accept All" so advertisers can track you across sites', 0),
(1020, 'Disable your antivirus software before browsing', 0),
(1020, 'Type your password into the cookie banner', 0),

-- L5
(1021, 'A credential-stealing phishing scam designed to hijack your gaming account', 1),
(1021, 'An official developer discount event', 0),
(1021, 'A normal way to verify your gaming rank', 0),
(1021, 'A safe browser plugin for faster frame rates', 0),

(1022, 'They can lead to financial loss, addiction, and exposure to unregulated scam platforms', 1),
(1022, 'They guarantee steady income for students', 0),
(1022, 'They are required to pass school IT subjects', 0),
(1022, 'They automatically protect your device from viruses', 0),

(1023, 'Decline and do not download it—cheat tools frequently bundle account-stealing malware', 1),
(1023, 'Download it and turn off your antivirus so it can install', 0),
(1023, 'Run it on your main account to test if it works', 0),
(1023, 'Share the download link with your whole clan', 0),

(1024, 'Enabling Two-Factor Authentication (2FA)', 1),
(1024, 'Using your in-game username as your password', 0),
(1024, 'Logging in on public computer shop PCs without signing out', 0),
(1024, 'Sharing your account with a friend to rank up faster', 0),

(1025, 'By balancing playtime with studies, playing on official platforms, and practicing respectful teamwork', 1),
(1025, 'By skipping sleep to grind overnight every school day', 0),
(1025, 'By spending allowance on unverified third-party top-up sites', 0),
(1025, 'By sharing personal contact details with every stranger in voice chat', 0);