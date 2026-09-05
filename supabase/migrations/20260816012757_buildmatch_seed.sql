/*
# BuildMatch AI — Seed Demo Data

Populates all tables with realistic Indian demo data for the SIH prototype.
All IDs are valid UUIDs (version-style 8-4-4-4-12 hex) so relationships resolve.
*/

-- =========================================================
-- USERS
-- =========================================================
INSERT INTO app_users (id, name, email, role, location, phone) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Nishi Sharma', 'nishi.sharma@example.com', 'homeowner', 'Coimbatore', '+91 98765 43210'),
  ('a1000000-0000-0000-0000-000000000002', 'Admin User', 'admin@buildmatch.ai', 'admin', 'Bengaluru', '+91 90000 11111'),
  ('a1000000-0000-0000-0000-000000000003', 'Er. S. Karthik', 'karthik@buildmatch.ai', 'engineer', 'Coimbatore', '+91 98422 12345')
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- ENGINEERS (8)
-- =========================================================
INSERT INTO engineers (id, user_id, name, email, phone, photo_url, location, experience_years, projects_completed, rating, reviews_count, specializations, price_per_sqft, price_min, price_max, qualification, verification_status, identity_verified, credential_verified, trust_score, trust_level, on_time_pct, budget_adherence_pct, quality_score, complaints_count, availability, bio, portfolio) VALUES
  (
    'e2000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000003',
    'Er. S. Karthik',
    'karthik@buildmatch.ai',
    '+91 98422 12345',
    '/people/engineer-1.jpg',
    'Coimbatore',
    12, 48, 4.8, 32,
    ARRAY['Residential','Villa','Modern','2BHK','3BHK'],
    1850, 1600000, 3500000,
    'M.E. Structural Engineering, Anna University',
    'verified', true, true, 91, 'Excellent', 94, 92, 95, 0, 'Available',
    'Senior civil engineer specialising in modern residential construction across Tamil Nadu. 12+ years delivering quality homes on time and on budget.',
    '[{"title":"Modern 3BHK Villa","location":"Coimbatore","year":2023,"image":"https://images.unsplash.com/photo-1564013799922-ab2f4c6eaf2a?w=600&h=400&fit=crop"},{"title":"Contemporary 2BHK","location":"Coimbatore","year":2022,"image":"https://images.unsplash.com/photo-1480074538268-336d6f9b5e9f?w=600&h=400&fit=crop"},{"title":"G+2 Residential","location":"Pollachi","year":2022,"image":"https://images.unsplash.com/photo-1486328211869-4e9e2f0b1f0a?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000002', NULL,
    'Er. Priya Menon', 'priya@buildmatch.ai', '+91 98400 56789',
    '/people/engineer-2.jpg',
    'Bengaluru', 10, 41, 4.7, 28,
    ARRAY['Residential','Apartment','Contemporary','Eco-friendly'],
    1750, 1400000, 3200000, 'B.E. Civil, M.Tech Construction Management',
    'verified', true, true, 88, 'Excellent', 90, 89, 91, 1, 'Available',
    'Bengaluru-based civil engineer focused on sustainable residential design and green building practices.',
    '[{"title":"Eco Villa","location":"Bengaluru","year":2023,"image":"https://images.unsplash.com/photo-1564013799922-ab2f4c6eaf2a?w=600&h=400&fit=crop"},{"title":"Green Apartment","location":"Whitefield","year":2022,"image":"https://images.unsplash.com/photo-1486328211869-4e9e2f0b1f0a?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000003', NULL,
    'Er. Arjun Reddy', 'arjun@buildmatch.ai', '+91 99491 22334',
    '/people/engineer-3.jpg',
    'Hyderabad', 15, 62, 4.9, 45,
    ARRAY['Residential','Villa','Luxury','G+3','Commercial'],
    2100, 2500000, 6000000, 'M.E. Structural, Osmania University',
    'verified', true, true, 94, 'Excellent', 96, 95, 97, 0, 'Available',
    'Veteran structural engineer with 15 years in luxury residential and commercial construction across Telangana.',
    '[{"title":"Luxury Villa","location":"Jubilee Hills","year":2023,"image":"https://images.unsplash.com/photo-1613490493576-88f9015f7c78?w=600&h=400&fit=crop"},{"title":"G+3 Apartments","location":"Madhapur","year":2022,"image":"https://images.unsplash.com/photo-1486328211869-4e9e2f0b1f0a?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000004', NULL,
    'Er. Ananya Iyer', 'ananya@buildmatch.ai', '+91 98479 88556',
    '/people/engineer-4.jpg',
    'Chennai', 8, 35, 4.6, 24,
    ARRAY['Residential','Apartment','Traditional','2BHK'],
    1650, 1200000, 2800000, 'B.Arch, Anna University',
    'verified', true, true, 85, 'Good', 88, 86, 88, 2, 'Available',
    'Architect-civil engineer blending traditional Tamil design with modern functionality.',
    '[{"title":"Traditional 2BHK","location":"Chennai","year":2023,"image":"https://images.unsplash.com/photo-1564013799922-ab2f4c6eaf2a?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000005', NULL,
    'Er. Vikram Nair', 'vikram@buildmatch.ai', '+91 98950 11223',
    '/people/engineer-5.jpg',
    'Kochi', 14, 52, 4.8, 38,
    ARRAY['Residential','Villa','Waterfront','Modern'],
    1950, 1800000, 4500000, 'M.Tech Civil, IIT Madras',
    'verified', true, true, 90, 'Excellent', 93, 91, 92, 1, 'Busy',
    'Kochi-based engineer specialising in waterfront and premium residential projects.',
    '[{"title":"Waterfront Villa","location":"Kochi","year":2023,"image":"https://images.unsplash.com/photo-1613490493576-88f9015f7c78?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000006', NULL,
    'Er. Rohit Deshmukh', 'rohit@buildmatch.ai', '+91 99230 44556',
    '/people/engineer-7.jpg',
    'Pune', 9, 38, 4.5, 22,
    ARRAY['Residential','Apartment','Modern','Budget'],
    1550, 1000000, 2500000, 'B.E. Civil, Pune University',
    'verified', true, true, 82, 'Good', 85, 84, 85, 3, 'Available',
    'Pune civil engineer focused on affordable modern residential construction.',
    '[{"title":"Budget 2BHK","location":"Pune","year":2023,"image":"https://images.unsplash.com/photo-1480074538268-336d6f9b5e9f?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000007', NULL,
    'Er. Kavya Krishnan', 'kavya@buildmatch.ai', '+91 98475 66778',
    '/people/engineer-6.jpg',
    'Coimbatore', 7, 29, 4.7, 19,
    ARRAY['Residential','2BHK','Modern','Sustainable'],
    1700, 1300000, 3000000, 'M.E. Structural, PSG Tech',
    'pending', true, false, 78, 'Good', 86, 85, 87, 1, 'Available',
    'Emerging civil engineer in Coimbatore with a focus on sustainable residential builds. Verification in progress.',
    '[{"title":"Sustainable 2BHK","location":"Coimbatore","year":2023,"image":"https://images.unsplash.com/photo-1486328211869-4e9e2f0b1f0a?w=600&h=400&fit=crop"}]'
  ),
  (
    'e2000000-0000-0000-0000-000000000008', NULL,
    'Er. Sanjay Gupta', 'sanjay@buildmatch.ai', '+91 99100 77889',
    '/people/engineer-8.jpg',
    'Mumbai', 18, 75, 4.9, 56,
    ARRAY['Residential','Luxury','Villa','High-rise','Commercial'],
    2300, 3000000, 8000000, 'M.E. Structural, IIT Bombay',
    'verified', true, true, 96, 'Excellent', 97, 96, 98, 0, 'Busy',
    'Mumbai-based senior engineer with 18 years in luxury and high-rise residential construction.',
    '[{"title":"Luxury High-rise","location":"Mumbai","year":2023,"image":"https://images.unsplash.com/photo-1613490493576-88f9015f7c78?w=600&h=400&fit=crop"}]'
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- PROJECTS (3)
-- =========================================================
INSERT INTO projects (id, homeowner_id, engineer_id, title, house_type, location, area_sqft, budget, construction_style, start_date, expected_completion, actual_completion, progress, current_milestone, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Dream Home — 2BHK Modern', '2BHK', 'Coimbatore', 1500, 2800000, 'Modern', '2025-01-15', '2025-12-20', NULL, 60, 'Roofing', 'active'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'Green Villa — 3BHK Eco', '3BHK', 'Bengaluru', 2000, 3500000, 'Eco-friendly', '2024-02-01', '2025-01-30', '2025-02-10', 100, 'Handover', 'completed'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', NULL, 'Planned Duplex — 4BHK', '4BHK', 'Coimbatore', 2800, 5500000, 'Contemporary', '2026-01-10', '2026-12-30', NULL, 0, 'Foundation', 'planning')
ON CONFLICT DO NOTHING;

-- =========================================================
-- MILESTONES
-- =========================================================
INSERT INTO milestones (id, project_id, name, order_index, status, planned_date, actual_date, verified, verification_status, payment_linked) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Foundation', 1, 'completed', '2025-02-01', '2025-02-03', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Structure', 2, 'completed', '2025-04-15', '2025-04-18', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Roofing', 3, 'in_progress', '2025-07-01', NULL, false, 'review_required', true),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Electrical', 4, 'upcoming', '2025-09-01', NULL, false, 'pending', true),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'Finishing', 5, 'upcoming', '2025-10-15', NULL, false, 'pending', true),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'Handover', 6, 'upcoming', '2025-12-20', NULL, false, 'pending', true),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 'Foundation', 1, 'completed', '2024-03-01', '2024-03-02', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'Structure', 2, 'completed', '2024-05-15', '2024-05-14', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002', 'Roofing', 3, 'completed', '2024-07-20', '2024-07-22', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 'Electrical', 4, 'completed', '2024-09-15', '2024-09-16', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000002', 'Finishing', 5, 'completed', '2024-11-20', '2024-11-25', true, 'verified', true),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000002', 'Handover', 6, 'completed', '2025-01-30', '2025-02-10', true, 'verified', true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- PAYMENTS
-- =========================================================
INSERT INTO payments (id, project_id, milestone_id, milestone_name, amount, status, paid_date, due_date) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Foundation', 420000, 'paid', '2025-02-05', '2025-02-01'),
  ('d1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Structure', 700000, 'paid', '2025-04-20', '2025-04-15'),
  ('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Roofing', 560000, 'paid', '2025-07-05', '2025-07-01'),
  ('d1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Electrical', 420000, 'pending', NULL, '2025-09-01'),
  ('d1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 'Finishing', 420000, 'pending', NULL, '2025-10-15'),
  ('d1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 'Handover', 280000, 'pending', NULL, '2025-12-20'),
  ('d1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 'Foundation', 525000, 'paid', '2024-03-05', '2024-03-01'),
  ('d1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000008', 'Structure', 875000, 'paid', '2024-05-16', '2024-05-15'),
  ('d1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000009', 'Roofing', 700000, 'paid', '2024-07-23', '2024-07-20'),
  ('d1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000010', 'Electrical', 525000, 'paid', '2024-09-17', '2024-09-15'),
  ('d1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000011', 'Finishing', 525000, 'paid', '2024-11-26', '2024-11-20'),
  ('d1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000012', 'Handover', 350000, 'paid', '2025-02-10', '2025-01-30')
ON CONFLICT DO NOTHING;

-- =========================================================
-- DOCUMENTS (6)
-- =========================================================
INSERT INTO documents (id, project_id, name, category, file_url, uploaded_date, size_kb) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Building_Plan_Approved.pdf', 'Building Plan', NULL, '2025-01-10', 2400),
  ('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Engineer_Agreement_Karthik.pdf', 'Engineer Agreement', NULL, '2025-01-12', 850),
  ('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Cost_Estimate_Detailed.xlsx', 'Cost Estimate', NULL, '2025-01-14', 1200),
  ('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'DTCP_Approval.pdf', 'Government Approval', NULL, '2025-01-08', 3100),
  ('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'Foundation_Evidence_Photos.zip', 'Milestone Evidence', NULL, '2025-02-04', 8500),
  ('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'Invoice_Structure.pdf', 'Invoices', NULL, '2025-04-19', 640)
ON CONFLICT DO NOTHING;

-- =========================================================
-- MESSAGES
-- =========================================================
INSERT INTO messages (id, project_id, sender_id, receiver_id, sender_role, content, attachment_name, created_at) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'engineer', 'Namaste Nishi! Foundation work is complete and verified. Moving to structure phase next week.', NULL, '2025-02-05 10:30:00+00'),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'homeowner', 'Great news Karthik ji! When can we expect the structure milestone?', NULL, '2025-02-05 11:15:00+00'),
  ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'engineer', 'Structure work should complete by mid-April. I have attached the revised schedule.', 'Revised_Schedule.pdf', '2025-02-06 09:00:00+00'),
  ('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'homeowner', 'Thank you! Roofing material has been ordered?', NULL, '2025-06-20 14:20:00+00'),
  ('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'engineer', 'Yes, roofing material delivery is scheduled. There is a slight 4-day delay due to supplier availability. I will keep you updated.', NULL, '2025-06-21 08:45:00+00'),
  ('f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'homeowner', 'Understood. Please share site photos once roofing starts.', NULL, '2025-06-21 10:10:00+00')
ON CONFLICT DO NOTHING;

-- =========================================================
-- REVIEWS (10)
-- =========================================================
INSERT INTO reviews (id, project_id, engineer_id, homeowner_name, rating, quality_rating, timeline_rating, communication_rating, budget_rating, feedback, verified, created_at) VALUES
  ('1a000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'Nishi Sharma', 5, 5, 4, 5, 5, 'Er. Priya delivered our eco villa with excellent quality. Slight timeline overrun but communication was outstanding throughout.', true, '2025-02-15 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000002', NULL, 'e2000000-0000-0000-0000-000000000001', 'Rajesh Kumar', 5, 5, 5, 5, 4, 'Karthik sir built our 3BHK villa with exceptional attention to detail. On time, on budget, and the quality is superb.', true, '2024-11-10 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000003', NULL, 'e2000000-0000-0000-0000-000000000001', 'Lakshmi Venkat', 4, 5, 4, 5, 5, 'Professional and reliable. The 2BHK project was completed with good quality. Minor delays but well communicated.', true, '2024-08-22 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000004', NULL, 'e2000000-0000-0000-0000-000000000003', 'Suresh Babu', 5, 5, 5, 5, 5, 'Arjun Reddy is the best structural engineer in Hyderabad. Our luxury villa exceeded expectations in every way.', true, '2024-12-05 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000005', NULL, 'e2000000-0000-0000-0000-000000000003', 'Deepa Rao', 5, 5, 5, 4, 5, 'Outstanding work on our G+3 apartment project. Highly recommend for any luxury construction.', true, '2024-09-18 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000006', NULL, 'e2000000-0000-0000-0000-000000000004', 'Meena Krishnan', 4, 4, 4, 5, 4, 'Ananya delivered a beautiful traditional 2BHK. Good quality and reasonable budget. Communication was excellent.', true, '2024-10-30 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000007', NULL, 'e2000000-0000-0000-0000-000000000005', 'Thomas Mathew', 5, 5, 5, 5, 4, 'Vikram built our waterfront villa with exceptional craftsmanship. A premium experience end to end.', true, '2024-07-14 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000008', NULL, 'e2000000-0000-0000-0000-000000000006', 'Sneha Patil', 4, 4, 4, 4, 5, 'Rohit delivered our budget 2BHK on budget. Quality was good for the price point. Some communication gaps.', true, '2024-11-20 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000009', NULL, 'e2000000-0000-0000-0000-000000000008', 'Aditya Mehta', 5, 5, 5, 5, 5, 'Sanjay is a world-class engineer. Our luxury high-rise in Mumbai is a testament to his expertise. Worth every rupee.', true, '2024-12-28 10:00:00+00'),
  ('1a000000-0000-0000-0000-000000000010', NULL, 'e2000000-0000-0000-0000-000000000008', 'Priya Shah', 5, 5, 5, 5, 4, 'Exceptional quality and professionalism on our Worli apartment project. Highly recommended for luxury builds.', true, '2024-06-15 10:00:00+00')
ON CONFLICT DO NOTHING;

-- =========================================================
-- COMPLAINTS (1)
-- =========================================================
INSERT INTO complaints (id, project_id, engineer_id, homeowner_name, category, subject, description, status, created_at, resolved_at) VALUES
  ('2a000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Nishi Sharma', 'Delay', 'Roofing milestone delay', 'The roofing milestone is running 4 days behind the planned schedule. Requesting updated timeline and material availability confirmation.', 'under_review', '2025-07-05 09:00:00+00', NULL)
ON CONFLICT DO NOTHING;

-- =========================================================
-- RISK ASSESSMENTS
-- =========================================================
INSERT INTO risk_assessments (id, project_id, overall_risk, delay_risk, budget_risk, quality_risk, engineer_risk, delay_reason, budget_reason, quality_reason, engineer_reason, recommended_action) VALUES
  (
    '3a000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'medium', 'medium', 'low', 'low', 'low',
    'Roofing milestone is 4 days behind planned schedule due to material supply delay.',
    'Budget is well within range. 60% of budget used for 60% progress — on track.',
    'Quality scores from verified reviews remain high (95/100). No quality concerns detected.',
    'Engineer trust score is 91/100 (Excellent) with zero complaints history.',
    'Review material availability and revised timeline with engineer. Confirm roofing completion date.'
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- MILESTONE EVIDENCE (AI-assisted verification)
-- =========================================================
INSERT INTO milestone_evidence (id, milestone_id, project_id, image_url, detected_stage, confidence, expected_milestone, evidence_tags, result, human_status) VALUES
  (
    '4a000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'https://images.unsplash.com/photo-1503387762-592deb58ef22?w=800&h=600&fit=crop',
    'Roofing', 92, 'Roofing',
    ARRAY['Columns detected','Roof slab visible','Masonry progress detected'],
    'verified', 'pending'
  ),
  (
    '4a000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'https://images.unsplash.com/photo-1581094288338-2314dddb7b14?w=800&h=600&fit=crop',
    'Foundation', 95, 'Foundation',
    ARRAY['Excavation complete','Footings visible','Concrete pouring detected'],
    'verified', 'approved'
  ),
  (
    '4a000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000008',
    'b1000000-0000-0000-0000-000000000002',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
    'Structure', 94, 'Structure',
    ARRAY['Columns cast','Beam framework visible','Slab reinforcement detected'],
    'verified', 'approved'
  )
ON CONFLICT DO NOTHING;
