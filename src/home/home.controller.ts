import { Controller, Get } from '@nestjs/common';
import { HomeResponseDTO } from './home.dto';
import { HomeService } from './home.service';

/**
 * Public home aggregation (plan T10). Deliberately registers no auth guard:
 * GET /home is a public endpoint and the app has no global guard, so the
 * route is reachable without any Authorization header.
 */
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHome(): Promise<HomeResponseDTO> {
    return this.homeService.getHome();
  }
}
