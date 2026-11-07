import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { provideRouter } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let userSession: UserSessionService;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  beforeEach(async () => {
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', ['getAvailableAlgorithms']);
    biometricApiSpy.getAvailableAlgorithms.and.returnValue(
      of([
        {
          id: 'RANDOM_FOREST_HPO',
          name: 'Random Forest HPO',
          description: '',
          hasHPO: true
        }
      ])
    );

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: BiometricApiService, useValue: biometricApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    userSession = TestBed.inject(UserSessionService);
    fixture.detectChanges();
  });

  it('deve criar o componente do dashboard', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar algoritmos disponíveis no ngOnInit', () => {
    expect(biometricApiSpy.getAvailableAlgorithms).toHaveBeenCalled();
    expect(component.availableAlgorithms.length).toBe(1);
  });

  it('deve extrair as principais features de uma amostra', () => {
    const mockSample = {
      repetition: 1,
      textEntered: 'teste',
      features: {
        'H.period': 0.12,
        'DD.period.t': 0.35,
        'UD.period.t': 0.23
      },
      rawTimings: [],
      totalDurationMs: 400
    };

    const topFeatures = component.getTopFeatures(mockSample);
    expect(topFeatures.length).toBe(3);
    expect(topFeatures[0].key).toBe('H.period');
  });
});
