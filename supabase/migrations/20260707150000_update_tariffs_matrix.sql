BEGIN;

ALTER TABLE public.subscription_tiers ADD COLUMN category VARCHAR(50) DEFAULT 'catalog';

UPDATE public.subscription_tiers SET is_active = false;

INSERT INTO public.subscription_tiers (name, category, price_monthly, discount_3_months, discount_6_months, discount_12_months, limits, is_active) VALUES
('Базовый', 'catalog', 3000, 10, 15, 20, '{"max_courses": 3, "max_lessons": 3, "lms_unlocked": false, "max_users": null}'::jsonb, true),
('Профессиональный', 'catalog', 9000, 10, 15, 20, '{"max_courses": 12, "max_lessons": 3, "lms_unlocked": false, "max_users": null}'::jsonb, true),
('Премиальный', 'catalog', 15000, 10, 15, 20, '{"max_courses": 30, "max_lessons": 3, "lms_unlocked": false, "max_users": null}'::jsonb, true);

INSERT INTO public.subscription_tiers (name, category, price_monthly, discount_3_months, discount_6_months, discount_12_months, limits, is_active) VALUES
('Онлайн-школа', 'lms', 9000, 10, 15, 20, '{"max_courses": 3, "max_lessons": null, "lms_unlocked": true, "max_users": null}'::jsonb, true),
('Онлайн-Университет', 'lms', 18000, 10, 15, 20, '{"max_courses": 12, "max_lessons": null, "lms_unlocked": true, "max_users": null}'::jsonb, true),
('Онлайн-Академия', 'lms', 29000, 10, 15, 20, '{"max_courses": 30, "max_lessons": null, "lms_unlocked": true, "max_users": null}'::jsonb, true);

INSERT INTO public.subscription_tiers (name, category, price_monthly, discount_3_months, discount_6_months, discount_12_months, limits, is_active) VALUES
('Команда', 'corporate', 5000, 10, 15, 20, '{"max_courses": null, "max_lessons": null, "lms_unlocked": true, "max_users": 20}'::jsonb, true),
('Бизнес', 'corporate', 20000, 10, 15, 20, '{"max_courses": null, "max_lessons": null, "lms_unlocked": true, "max_users": 100}'::jsonb, true),
('Enterprise', 'corporate', 80000, 10, 15, 20, '{"max_courses": null, "max_lessons": null, "lms_unlocked": true, "max_users": 500}'::jsonb, true);

COMMIT;
