-- Phase 5: tiered tariff structure per room
-- first_hour_rate: price for the first 60 minutes
-- subsequent_rate: price per hour after the first hour

alter table rooms
  add column if not exists first_hour_rate numeric(10,2),
  add column if not exists subsequent_rate numeric(10,2);

-- Apply defaults based on room type
-- Standard: 250₽ first hour, 200₽/h after
-- VIP:      350₽ first hour, 300₽/h after
update rooms set
  first_hour_rate = case when type = 'vip' then 350 else 250 end,
  subsequent_rate = case when type = 'vip' then 300 else 200 end
where first_hour_rate is null;
