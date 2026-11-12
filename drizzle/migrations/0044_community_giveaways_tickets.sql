CREATE TABLE public.giveaway_settings (
 id integer PRIMARY KEY DEFAULT 1,
 config jsonb NOT NULL DEFAULT '{"title":"Giveaway","description":"Complete simple social tasks and submit your original work for a balance reward.","rules":"Use your registered Apex SMM World account.\nSubmit original, public content and a working proof link.\nOne submission per task per account.\nDuplicate, misleading or copied submissions are not eligible.\nRewards are added only after manual verification by our team.","steps":["Complete the Task","Submit Your Proof","Receive Your Rewards"],"tasks":[{"id":"youtube-review","platform":"youtube","title":"YouTube Review Giveaway","summary":"Share your honest experience in a YouTube video.","reward":2,"currency":"USD","active":true,"how":"Create an original video about your experience with Apex SMM World.\nInclude https://apexsmmworld.com in the video description.\nSubmit the public video link for review.","conditions":"Use your own content.\nThe video must be publicly accessible.\nRewards require manual approval; submitting proof does not guarantee a reward."},{"id":"facebook-post","platform":"facebook","title":"Facebook Giveaway","summary":"Share your experience in an original Facebook post.","reward":1,"currency":"USD","active":true,"how":"Write an original post about your experience.\nInclude https://apexsmmworld.com and submit the public post link.","conditions":"The post must be original and public.\nOne submission per account.\nRewards require manual approval."},{"id":"tiktok-video","platform":"tiktok","title":"TikTok Giveaway","summary":"Create an original TikTok about Apex SMM World.","reward":1,"currency":"USD","active":true,"how":"Create an original TikTok video about your experience.\nMention Apex SMM World and submit the public video link.","conditions":"The video must be original and public.\nOne submission per account.\nRewards require manual approval."},{"id":"linkedin-post","platform":"linkedin","title":"LinkedIn Giveaway","summary":"Share your honest experience with your network.","reward":1,"currency":"USD","active":true,"how":"Write an original LinkedIn post about your experience.\nInclude https://apexsmmworld.com and submit the public post link.","conditions":"The post must be original and public.\nOne submission per account.\nRewards require manual approval."}]}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.giveaway_settings TO anon, authenticated;
GRANT ALL ON public.giveaway_settings TO service_role;
ALTER TABLE public.giveaway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY giveaway_settings_public ON public.giveaway_settings FOR SELECT TO anon, authenticated USING (id=1);
INSERT INTO public.giveaway_settings(id) SELECT 1 ON CONFLICT DO NOTHING;
CREATE TABLE public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 user_id uuid NOT NULL, subject text NOT NULL, subcategory text NOT NULL DEFAULT '',
 order_codes text[] NOT NULL DEFAULT '{}', task_id text,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','pending','answered','closed')),
 messages jsonb NOT NULL DEFAULT '[]', idempotency_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(user_id,idempotency_key)
);
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.support_tickets_ticket_no_seq TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_tickets_owner ON public.support_tickets FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX support_tickets_user_updated ON public.support_tickets(user_id,updated_at DESC);
CREATE FUNCTION public.submit_support_ticket(_subject text,_subcategory text,_orders text[],_body text,_attachments jsonb,_task text,_idem uuid) RETURNS public.support_tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _row public.support_tickets; _path text;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=_uid AND NOT banned AND deleted_at IS NULL) THEN RAISE EXCEPTION 'ACCOUNT_SUSPENDED'; END IF;
 SELECT * INTO _row FROM support_tickets WHERE user_id=_uid AND idempotency_key=_idem; IF FOUND THEN RETURN _row; END IF;
 IF _subject NOT IN ('Order','Payment','Service','Other','Giveaway') OR length(trim(_body)) NOT BETWEEN 1 AND 5000 OR length(_subcategory)>200 OR coalesce(cardinality(_orders),0)>20 THEN RAISE EXCEPTION 'INVALID_TICKET'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(_orders) c WHERE NOT EXISTS(SELECT 1 FROM orders o WHERE o.user_id=_uid AND o.order_code=c AND o.deleted_at IS NULL)) THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF _subject='Order' AND coalesce(cardinality(_orders),0)=0 THEN RAISE EXCEPTION 'ORDER_REQUIRED'; END IF;
 IF jsonb_typeof(_attachments)<>'array' OR jsonb_array_length(_attachments)>3 THEN RAISE EXCEPTION 'INVALID_ATTACHMENT'; END IF;
 FOR _path IN SELECT value->>'path' FROM jsonb_array_elements(_attachments) LOOP
  IF _path IS NULL OR _path NOT LIKE _uid::text||'/%' OR position('..' in _path)>0 THEN RAISE EXCEPTION 'INVALID_ATTACHMENT'; END IF;
 END LOOP;
 IF _subject='Giveaway' AND NOT EXISTS(SELECT 1 FROM giveaway_settings g,jsonb_array_elements(g.config->'tasks') t WHERE g.id=1 AND t->>'id'=_task AND (t->>'active')::boolean) THEN RAISE EXCEPTION 'TASK_UNAVAILABLE'; END IF;
 INSERT INTO support_tickets(user_id,subject,subcategory,order_codes,task_id,idempotency_key,messages) VALUES(_uid,_subject,_subcategory,coalesce(_orders,'{}'),_task,_idem,jsonb_build_array(jsonb_build_object('author','customer','body',trim(_body),'attachments',_attachments,'created_at',now()))) ON CONFLICT(user_id,idempotency_key) DO NOTHING RETURNING * INTO _row;
 IF _row.id IS NULL THEN SELECT * INTO _row FROM support_tickets WHERE user_id=_uid AND idempotency_key=_idem; END IF;
 RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.submit_support_ticket(text,text,text[],text,jsonb,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_support_ticket(text,text,text[],text,jsonb,text,uuid) TO authenticated;
CREATE FUNCTION public.reply_support_ticket(_id uuid,_body text,_attachments jsonb,_admin boolean DEFAULT false,_status text DEFAULT NULL) RETURNS public.support_tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _row public.support_tickets; _path text; _isadmin boolean:=coalesce(auth.role(),'')='service_role';
BEGIN
 IF _admin AND NOT _isadmin THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO _row FROM support_tickets WHERE id=_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR (NOT _admin AND (_row.user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND NOT banned AND deleted_at IS NULL))) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF length(trim(_body)) NOT BETWEEN 1 AND 5000 OR jsonb_typeof(_attachments)<>'array' OR jsonb_array_length(_attachments)>3 THEN RAISE EXCEPTION 'INVALID_REPLY'; END IF;
 IF NOT _admin AND _row.status='closed' THEN RAISE EXCEPTION 'TICKET_CLOSED'; END IF;
 IF _admin AND _status NOT IN ('pending','answered','closed') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 FOR _path IN SELECT value->>'path' FROM jsonb_array_elements(_attachments) LOOP
  IF _path IS NULL OR _path NOT LIKE _row.user_id::text||'/%' OR position('..' in _path)>0 THEN RAISE EXCEPTION 'INVALID_ATTACHMENT'; END IF;
 END LOOP;
 UPDATE support_tickets SET messages=messages||jsonb_build_array(jsonb_build_object('author',CASE WHEN _admin THEN 'admin' ELSE 'customer' END,'body',trim(_body),'attachments',_attachments,'created_at',now())),status=CASE WHEN _admin THEN coalesce(_status,'answered') ELSE 'pending' END,updated_at=now() WHERE id=_id RETURNING * INTO _row;
 IF _admin THEN INSERT INTO notifications(user_id,kind,title,body,link,button) VALUES(_row.user_id,'notification','Ticket #'||_row.ticket_no||' updated',left(trim(_body),1000),'/tickets','View Ticket'); END IF;
 RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.reply_support_ticket(uuid,text,jsonb,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid,text,jsonb,boolean,text) TO authenticated,service_role;
CREATE POLICY support_attachment_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='support-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY support_attachment_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='support-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY support_attachment_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='support-attachments' AND (storage.foldername(name))[1]=auth.uid()::text AND owner_id=auth.uid()::text);