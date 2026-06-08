import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    // Using service role or anon key to check tokens is supported. 
    // We can use anon key since it is public and sufficient to check client JWTs.
    const anonKey = config.get<string>('SUPABASE_ANON_KEY') || config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'dummy';
    
    this.supabase = createClient(url || 'https://dummy.supabase.co', anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      // Attach the user metadata directly to the request
      request.user = {
        id: user.id,
        email: user.email,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
